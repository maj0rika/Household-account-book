import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isBankMessage, preprocessBankMessage } from "../bank-message";
import type { LLMChatClient } from "../client";
import { parseUnifiedText } from "../index";
import { isFinancialInput } from "../ood-filter";
import { PROMPT_CACHE_DELIMITER, STATIC_SYSTEM_PROMPT_PREFIX, type LLMCategory } from "../prompt";
import {
	createParseRequestId,
	hashInput,
	redactInputPreview,
	type LlmAttemptTelemetry,
} from "../telemetry";
import type { Account } from "@/types";

export const GOLDEN_CORPUS_GROUPS = [
	"expense",
	"income",
	"transfer_and_account",
	"multi_item",
	"relative_date",
	"bank_sms",
	"refund_cancel",
	"slang_typo",
	"ood",
] as const;

export type GoldenCorpusGroup = (typeof GOLDEN_CORPUS_GROUPS)[number];

export interface GoldenCorpusCase {
	id: string;
	group: GoldenCorpusGroup;
	input: string;
	today: string;
	expectOodPass: boolean;
	expectBankMessage?: boolean;
	expectNoiseStripped: string[];
	mockResponse: Record<string, unknown>;
	expect: {
		success: boolean;
		intent?: "transaction" | "account";
		transactionCount?: number;
		accountCount?: number;
		types?: Array<"income" | "expense">;
		amounts?: number[];
		dates?: string[];
		accountTypes?: Array<"asset" | "debt">;
		balances?: number[];
	};
}

export interface EvalCaseFailure {
	id: string;
	group: GoldenCorpusGroup;
	reasons: string[];
}

export interface OfflineEvalReport {
	totalCases: number;
	passedCases: number;
	failedCases: number;
	groupCounts: Record<GoldenCorpusGroup, number>;
	failures: EvalCaseFailure[];
	telemetrySampleCount: number;
	durationMs: number;
}

const DEFAULT_EVAL_CATEGORIES: LLMCategory[] = [
	{ name: "식비", type: "expense" },
	{ name: "카페/간식", type: "expense" },
	{ name: "교통", type: "expense" },
	{ name: "주거/관리비", type: "expense" },
	{ name: "생활용품", type: "expense" },
	{ name: "의류/미용", type: "expense" },
	{ name: "의료/건강", type: "expense" },
	{ name: "통신", type: "expense" },
	{ name: "여가/취미", type: "expense" },
	{ name: "교육", type: "expense" },
	{ name: "경조사/선물", type: "expense" },
	{ name: "기타 지출", type: "expense" },
	{ name: "급여", type: "income" },
	{ name: "용돈/부수입", type: "income" },
	{ name: "투자수익", type: "income" },
	{ name: "기타 수입", type: "income" },
];

const DEFAULT_EVAL_ACCOUNTS: Array<Pick<Account, "name" | "type">> = [
	{ name: "카카오뱅크", type: "asset" },
	{ name: "신한카드", type: "debt" },
	{ name: "토스증권", type: "asset" },
];

export function loadGoldenCorpus(
	corpusPath = resolve(fileURLToPath(new URL("./golden-corpus.jsonl", import.meta.url))),
): GoldenCorpusCase[] {
	const raw = readFileSync(corpusPath, "utf8").trim();
	if (!raw) return [];
	return raw.split("\n").map((line) => JSON.parse(line) as GoldenCorpusCase);
}

function createMockClient(
	mockResponse: Record<string, unknown>,
	capturedPrompts: { systemPrompt?: string; userPrompt?: string },
): LLMChatClient {
	return {
		chat: {
			completions: {
				create: async (params: {
					messages: Array<{ role: string; content: unknown }>;
				}) => {
					capturedPrompts.systemPrompt = String(params.messages[0]?.content ?? "");
					capturedPrompts.userPrompt = String(params.messages[1]?.content ?? "");
					return {
						choices: [{ message: { content: JSON.stringify(mockResponse) } }],
						usage: {
							prompt_tokens: 1200,
							completion_tokens: 140,
							total_tokens: 1340,
						},
					};
				},
			},
		},
	} as unknown as LLMChatClient;
}

function arraysEqual<T>(actual: T[], expected: T[] | undefined): boolean {
	if (!expected) return true;
	if (actual.length !== expected.length) return false;
	return actual.every((value, idx) => value === expected[idx]);
}

export async function runOfflineEval(cases = loadGoldenCorpus()): Promise<OfflineEvalReport> {
	const startedAt = Date.now();
	const failures: EvalCaseFailure[] = [];
	const seenIds = new Set<string>();
	const seenInputs = new Set<string>();
	const groupCounts = Object.fromEntries(
		GOLDEN_CORPUS_GROUPS.map((g) => [g, 0]),
	) as Record<GoldenCorpusGroup, number>;
	let telemetrySampleCount = 0;

	for (const entry of cases) {
		const reasons: string[] = [];
		groupCounts[entry.group] = (groupCounts[entry.group] ?? 0) + 1;

		if (seenIds.has(entry.id)) {
			reasons.push(`duplicate id: ${entry.id}`);
		}
		seenIds.add(entry.id);

		if (seenInputs.has(entry.input)) {
			reasons.push(`duplicate input: ${entry.input}`);
		}
		seenInputs.add(entry.input);

		// 1. OOD 1차 필터 검증
		const oodPass = isFinancialInput(entry.input);
		if (oodPass !== entry.expectOodPass) {
			reasons.push(`OOD mismatch: expected ${entry.expectOodPass}, got ${oodPass}`);
		}

		// 2. 은행 메시지 판별 및 전처리 검증
		const bankDetected = isBankMessage(entry.input);
		if (entry.expectBankMessage !== undefined && bankDetected !== entry.expectBankMessage) {
			reasons.push(`isBankMessage mismatch: expected ${entry.expectBankMessage}, got ${bankDetected}`);
		}

		const processedInput = bankDetected ? preprocessBankMessage(entry.input) : entry.input;
		for (const noise of entry.expectNoiseStripped) {
			if (processedInput.includes(noise)) {
				reasons.push(`bank noise not stripped: ${noise}`);
			}
		}

		// 3. OOD 1차 차단 대상이 아니면 mock LLM 파이프라인까지 통과시킨다.
		if (oodPass) {
			const parseRequestId = createParseRequestId();
			const capturedPrompts: { systemPrompt?: string; userPrompt?: string } = {};
			const attempts: LlmAttemptTelemetry[] = [];
			const mockClient = createMockClient(entry.mockResponse, capturedPrompts);

			const response = await parseUnifiedText(
				processedInput,
				DEFAULT_EVAL_CATEGORIES,
				DEFAULT_EVAL_ACCOUNTS,
				"kimi",
				{
					parseRequestId,
					today: entry.today,
					onAttempt: (t) => attempts.push(t),
					configOverride: {
						provider: "kimi",
						client: mockClient,
						model: "kimi-k3",
						temperature: 1,
					},
				},
			);

			// 프롬프트 캐시 정적 프리픽스 순서 확인
			if (
				!capturedPrompts.systemPrompt?.startsWith(
					`${STATIC_SYSTEM_PROMPT_PREFIX}${PROMPT_CACHE_DELIMITER}`,
				)
			) {
				reasons.push("systemPrompt missing static prefix before delimiter");
			}

			// 텔레메트리 상관관계 및 비식별화 확인
			if (attempts.length !== 1) {
				reasons.push(`expected 1 telemetry attempt, got ${attempts.length}`);
			} else {
				const t = attempts[0];
				telemetrySampleCount += 1;
				if (t.parseRequestId !== parseRequestId) {
					reasons.push("telemetry parseRequestId mismatch");
				}
				if (t.inputHash !== hashInput(processedInput)) {
					reasons.push("telemetry inputHash mismatch");
				}
				if (t.inputPreview !== redactInputPreview(processedInput)) {
					reasons.push("telemetry inputPreview mismatch");
				}
				if (/\d/.test(t.inputPreview)) {
					reasons.push(`telemetry inputPreview leaked digits: ${t.inputPreview}`);
				}
				if (!t.tokens || t.tokens.totalTokens !== 1340) {
					reasons.push("telemetry tokens missing or mismatched");
				}
			}

			if (response.success !== entry.expect.success) {
				reasons.push(`parse success mismatch: expected ${entry.expect.success}, got ${response.success}`);
			} else if (response.success) {
				if (entry.expect.intent && response.intent !== entry.expect.intent) {
					reasons.push(`intent mismatch: expected ${entry.expect.intent}, got ${response.intent}`);
				}
				if (
					entry.expect.transactionCount !== undefined &&
					response.transactions.length !== entry.expect.transactionCount
				) {
					reasons.push(
						`transactionCount mismatch: expected ${entry.expect.transactionCount}, got ${response.transactions.length}`,
					);
				}
				if (
					entry.expect.accountCount !== undefined &&
					response.accounts.length !== entry.expect.accountCount
				) {
					reasons.push(
						`accountCount mismatch: expected ${entry.expect.accountCount}, got ${response.accounts.length}`,
					);
				}
				if (!arraysEqual(response.transactions.map((x) => x.type), entry.expect.types)) {
					reasons.push("transaction types mismatch");
				}
				if (!arraysEqual(response.transactions.map((x) => x.amount), entry.expect.amounts)) {
					reasons.push("transaction amounts mismatch");
				}
				if (!arraysEqual(response.transactions.map((x) => x.date), entry.expect.dates)) {
					reasons.push("transaction dates mismatch");
				}
				if (!arraysEqual(response.accounts.map((x) => x.type), entry.expect.accountTypes)) {
					reasons.push("account types mismatch");
				}
				if (!arraysEqual(response.accounts.map((x) => x.balance), entry.expect.balances)) {
					reasons.push("account balances mismatch");
				}
			}
		}

		if (reasons.length > 0) {
			failures.push({ id: entry.id, group: entry.group, reasons });
		}
	}

	return {
		totalCases: cases.length,
		passedCases: cases.length - failures.length,
		failedCases: failures.length,
		groupCounts,
		failures,
		telemetrySampleCount,
		durationMs: Date.now() - startedAt,
	};
}
