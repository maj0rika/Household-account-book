import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { getLLMConfig } from "./client";
import type { LLMProvider } from "./client";
import { buildSystemPrompt, buildUserPrompt, buildImageUserPrompt } from "./prompt";
import type { LLMCategory } from "./prompt";
import type {
	ParsedTransaction,
	ParsedAccount,
	UnifiedParseResponse,
} from "./types";
import type { Account } from "@/types";

// 커스텀 에러 클래스 — 문자열 비교 대신 instanceof 사용 (M6)
export class LLMTimeoutError extends Error {
	constructor(message = "LLM 응답 시간 초과") {
		super(message);
		this.name = "LLMTimeoutError";
	}
}

const VALID_ACCOUNT_TYPES = new Set(["asset", "debt"]);
const VALID_SUB_TYPES = new Set(["bank", "cash", "savings", "investment", "credit_card", "loan", "other"]);
const VALID_SETTLEMENT_ROLES = new Set(["organizer", "participant"]);
const VALID_SETTLEMENT_STATUSES = new Set(["pending", "partial", "completed"]);
const VALID_SETTLEMENT_MEMBER_STATUSES = new Set(["pending", "partial", "paid"]);
const VALID_SETTLEMENT_SOURCE_TYPES = new Set(["text", "image", "manual"]);
const VALID_SETTLEMENT_SOURCE_SERVICES = new Set(["kakao", "toss", "unknown"]);

function extractJSON(text: string): string {
	// ```json ... ``` 블록 추출
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (fenced) return fenced[1].trim();

	// { ... } 객체 직접 추출 (통합 응답은 객체)
	const objectMatch = text.match(/\{[\s\S]*\}/);
	if (objectMatch) return objectMatch[0].trim();

	// [ ... ] 배열 직접 추출 (하위 호환)
	const arrayMatch = text.match(/\[[\s\S]*\]/);
	if (arrayMatch) return arrayMatch[0].trim();

	return text.trim();
}

function validateTransactions(data: unknown): ParsedTransaction[] {
	if (!Array.isArray(data)) return [];

	return data.map((item, i) => {
		if (!item.date || !item.type || !item.category || !item.description || item.amount == null) {
			throw new Error(`거래 항목 ${i + 1}에 필수 필드가 누락되었습니다.`);
		}
		if (item.type !== "income" && item.type !== "expense") {
			throw new Error(`거래 항목 ${i + 1}의 type이 유효하지 않습니다: ${item.type}`);
		}
		if (typeof item.amount !== "number" || item.amount <= 0) {
			throw new Error(`거래 항목 ${i + 1}의 금액이 유효하지 않습니다: ${item.amount}`);
		}

		const result: ParsedTransaction = {
			date: String(item.date),
			type: item.type as "income" | "expense",
			category: String(item.category),
			description: String(item.description),
			amount: Number(item.amount),
		};

		if (item.isRecurring === true) {
			result.isRecurring = true;
			result.dayOfMonth = typeof item.dayOfMonth === "number" ? item.dayOfMonth : undefined;
		}

		if (typeof item.suggestedCategory === "string" && item.suggestedCategory.trim()) {
			result.suggestedCategory = item.suggestedCategory.trim();
		}

		if (typeof item.accountImpactAmount === "number" && item.accountImpactAmount > 0) {
			result.accountImpactAmount = Number(item.accountImpactAmount);
		}

		if (item.isSettlement === true) {
			result.isSettlement = true;
		}

		if (typeof item.settlementRole === "string" && VALID_SETTLEMENT_ROLES.has(item.settlementRole)) {
			result.settlementRole = item.settlementRole as "organizer" | "participant";
			result.isSettlement = true;
		}

		if (typeof item.settlementTotalAmount === "number" && item.settlementTotalAmount > 0) {
			result.settlementTotalAmount = Number(item.settlementTotalAmount);
			result.isSettlement = true;
		}

		if (typeof item.myShareAmount === "number" && item.myShareAmount > 0) {
			result.myShareAmount = Number(item.myShareAmount);
			result.isSettlement = true;
		}

		if (typeof item.participantCount === "number" && item.participantCount > 0) {
			result.participantCount = Math.trunc(item.participantCount);
			result.isSettlement = true;
		}

		if (typeof item.settlementStatus === "string" && VALID_SETTLEMENT_STATUSES.has(item.settlementStatus)) {
			result.settlementStatus = item.settlementStatus as "pending" | "partial" | "completed";
		}

		if (typeof item.settlementSourceType === "string" && VALID_SETTLEMENT_SOURCE_TYPES.has(item.settlementSourceType)) {
			result.settlementSourceType = item.settlementSourceType as "text" | "image" | "manual";
		}

		if (typeof item.settlementSourceService === "string" && VALID_SETTLEMENT_SOURCE_SERVICES.has(item.settlementSourceService)) {
			result.settlementSourceService = item.settlementSourceService as "kakao" | "toss" | "unknown";
		}

			if (Array.isArray(item.settlementMembers)) {
				const members = item.settlementMembers
					.map((member: unknown) => {
						if (!member || typeof member !== "object") return null;
						const candidate = member as Record<string, unknown>;

						if (
							typeof candidate.name !== "string"
							|| typeof candidate.shareAmount !== "number"
							|| candidate.shareAmount <= 0
						) {
							return null;
						}

						const normalizedStatus = typeof candidate.status === "string" && VALID_SETTLEMENT_MEMBER_STATUSES.has(candidate.status)
							? candidate.status as "pending" | "partial" | "paid"
							: undefined;

						return {
							name: candidate.name.trim(),
							shareAmount: Number(candidate.shareAmount),
							status: normalizedStatus,
							paidAmount: typeof candidate.paidAmount === "number" && candidate.paidAmount > 0
								? Number(candidate.paidAmount)
								: undefined,
						};
					})
					.filter((
						member: {
							name: string;
							shareAmount: number;
							status?: "pending" | "partial" | "paid";
							paidAmount?: number;
						} | null,
					): member is {
						name: string;
						shareAmount: number;
						status?: "pending" | "partial" | "paid";
						paidAmount?: number;
					} => member !== null);

			if (members.length > 0) {
				result.settlementMembers = members;
				result.isSettlement = true;
			}
		}

		return result;
	});
}

function validateAccounts(data: unknown): ParsedAccount[] {
	if (!Array.isArray(data)) return [];

	return data.map((item, i) => {
		if (!item.name || !item.type || !item.subType || item.balance == null) {
			throw new Error(`계정 항목 ${i + 1}에 필수 필드가 누락되었습니다.`);
		}
		if (!VALID_ACCOUNT_TYPES.has(item.type)) {
			throw new Error(`계정 항목 ${i + 1}의 type이 유효하지 않습니다: ${item.type}`);
		}
		if (!VALID_SUB_TYPES.has(item.subType)) {
			throw new Error(`계정 항목 ${i + 1}의 subType이 유효하지 않습니다: ${item.subType}`);
		}

		return {
			name: String(item.name).trim(),
			type: item.type as "asset" | "debt",
			subType: item.subType as ParsedAccount["subType"],
			icon: typeof item.icon === "string" ? item.icon : "🏦",
			balance: Math.abs(Number(item.balance)),
		};
	});
}

// 통합 응답 파싱 (객체 or 배열 하위호환)
function parseUnifiedResponse(parsed: unknown): { intent: "transaction" | "account"; transactions: ParsedTransaction[]; accounts: ParsedAccount[] } {
	// 새 통합 포맷: { intent, transactions, accounts }
	if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
		const obj = parsed as Record<string, unknown>;

		// LLM이 OOD로 거부한 경우
		if (obj.rejected === true) {
			const reason = typeof obj.reason === "string" ? obj.reason : "가계부와 관련된 내용을 입력해 주세요.";
			throw new Error(reason);
		}

		const intent = (obj.intent === "account" ? "account" : "transaction") as "transaction" | "account";
		const transactions = validateTransactions(obj.transactions);
		const accounts = validateAccounts(obj.accounts);

		if (transactions.length === 0 && accounts.length === 0) {
			throw new Error("파싱 결과가 비어 있습니다.");
		}

		return { intent, transactions, accounts };
	}

	// 하위 호환: 배열 형태 → 거래로 간주
	if (Array.isArray(parsed)) {
		const transactions = validateTransactions(parsed);
		return { intent: "transaction", transactions, accounts: [] };
	}

	throw new Error("LLM 응답 형식을 인식할 수 없습니다.");
}

// 타임아웃 시 실제 벤더 요청도 abort하여 "늦게 200 완료"되는 유령 응답을 줄인다.
async function withTimeout<T>(
	task: (signal: AbortSignal) => Promise<T>,
	ms: number,
): Promise<T> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		controller.abort(new LLMTimeoutError());
	}, ms);

	try {
		return await task(controller.signal);
	} catch (error) {
		if (controller.signal.aborted) {
			const reason = controller.signal.reason;
			if (reason instanceof Error) {
				throw reason;
			}
			throw new LLMTimeoutError();
		}

		throw error;
	} finally {
		clearTimeout(timeoutId);
	}
}

function resolveTimeoutMs(timeoutMs?: number, fallback = 30000): number {
	if (timeoutMs == null || Number.isNaN(timeoutMs)) return fallback;
	return Math.max(15000, Math.min(timeoutMs, 120000));
}

function getElapsedMs(startedAt: number): number {
	return Date.now() - startedAt;
}

/**
 * 통합 파싱: 텍스트 입력 → 거래 또는 자산/부채 자동 분기
 */
export async function parseUnifiedText(
	input: string,
	categories: LLMCategory[],
	existingAccounts: Account[] = [],
	provider?: LLMProvider,
	options?: { timeoutMs?: number },
): Promise<UnifiedParseResponse> {
	const { client, model, temperature, extra_body } = getLLMConfig(provider);
	const today = new Date().toISOString().split("T")[0];
	const timeoutMs = resolveTimeoutMs(options?.timeoutMs, 30000);
	const providerName = provider ?? "default";

	const systemPrompt = buildSystemPrompt(categories, today, existingAccounts);
	const userPrompt = buildUserPrompt(input);
	const attempt = 1;
	const startedAt = Date.now();

	try {
		// 사용자 1회 요청은 벤더 1회 호출만 수행한다.
		const response = await withTimeout(
			(signal) => client.chat.completions.create({
				model,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userPrompt },
				],
				temperature,
				...extra_body,
			}, { signal }),
			timeoutMs,
		);

		const content = response.choices[0]?.message?.content;
		if (!content) {
			throw new Error("LLM 응답이 비어 있습니다.");
		}

		const jsonStr = extractJSON(content);
		const parsed = JSON.parse(jsonStr);
		const result = parseUnifiedResponse(parsed);

		console.info("[LLM] text parse success", {
			provider: providerName,
			model,
			attempt,
			timeoutMs,
			elapsedMs: getElapsedMs(startedAt),
			inputLength: input.trim().length,
		});

		return { success: true, ...result };
	} catch (error) {
		console.warn("[LLM] text parse failed", {
			provider: providerName,
			model,
			attempt,
			timeoutMs,
			elapsedMs: getElapsedMs(startedAt),
			inputLength: input.trim().length,
			error: error instanceof Error ? error.message : String(error),
		});

		const message = error instanceof Error ? error.message : "알 수 없는 오류";
		return { success: false, error: `파싱 실패: ${message}` };
	}
}

/**
 * 통합 파싱: 이미지 입력 → 거래 또는 자산/부채 자동 분기
 */
export async function parseUnifiedImage(
	imageBase64: string,
	mimeType: string,
	textInput: string,
	categories: LLMCategory[],
	existingAccounts: Account[] = [],
	provider?: LLMProvider,
	options?: { timeoutMs?: number },
): Promise<UnifiedParseResponse> {
	const { client, model, temperature, extra_body } = getLLMConfig(provider);
	const today = new Date().toISOString().split("T")[0];
	const timeoutMs = resolveTimeoutMs(options?.timeoutMs, 45000);
	const providerName = provider ?? "default";

	const systemPrompt = buildSystemPrompt(categories, today, existingAccounts);

	const userContent: ChatCompletionContentPart[] = [
		{
			type: "image_url",
			image_url: { url: `data:${mimeType};base64,${imageBase64}` },
		},
	];

	userContent.push({ type: "text", text: buildImageUserPrompt(textInput) });
	const attempt = 1;
	const startedAt = Date.now();

	try {
		// 사용자 1회 요청은 벤더 1회 호출만 수행한다.
		const response = await withTimeout(
			(signal) => client.chat.completions.create({
				model,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userContent },
				],
				temperature,
				...extra_body,
			}, { signal }),
			timeoutMs,
		);

		const content = response.choices[0]?.message?.content;
		if (!content) {
			throw new Error("LLM 응답이 비어 있습니다.");
		}

		const jsonStr = extractJSON(content);
		const parsed = JSON.parse(jsonStr);
		const result = parseUnifiedResponse(parsed);

		console.info("[LLM] image parse success", {
			provider: providerName,
			model,
			attempt,
			timeoutMs,
			elapsedMs: getElapsedMs(startedAt),
			textLength: textInput.trim().length,
		});

		return { success: true, ...result };
	} catch (error) {
		console.warn("[LLM] image parse failed", {
			provider: providerName,
			model,
			attempt,
			timeoutMs,
			elapsedMs: getElapsedMs(startedAt),
			textLength: textInput.trim().length,
			error: error instanceof Error ? error.message : String(error),
		});

		const message = error instanceof Error ? error.message : "알 수 없는 오류";
		return { success: false, error: `이미지 파싱 실패: ${message}` };
	}
}
