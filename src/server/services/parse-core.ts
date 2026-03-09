import { and, eq, ne } from "drizzle-orm";

import { db } from "@/server/db";
import { categories, accounts, settlements } from "@/server/db/schema";
import { decryptString, decryptNumber } from "@/server/lib/crypto";
import { parseUnifiedText, parseUnifiedImage } from "@/server/llm";
import type { LLMProvider } from "@/server/llm/client";
import { isBankMessage, preprocessBankMessage } from "@/server/llm/bank-message";
import { isFinancialInput, OOD_ERROR_MESSAGE } from "@/server/llm/ood-filter";
import { preprocessSettlementTransferMessage } from "@/server/llm/settlement-message";
import type { LLMCategory } from "@/server/llm/prompt";
import type { UnifiedParseResponse } from "@/server/llm/types";
import { matchParsedSettlementTransfers } from "@/server/settlement/transfer-matching";
import type { Account } from "@/types";

// 세션별 Fireworks 사용 카운터 (인메모리)
// key: sessionId, value: { count, lastUsed }
// 로그아웃 → 재로그인 시 새 세션 ID가 발급되므로 자동 리셋
const FIREWORKS_FREE_LIMIT = 3;
const MAX_MAP_SIZE = 1000;
const FIREWORKS_FAILURE_COOLDOWN_MS = 10 * 60 * 1000;
const fireworksUsageMap = new Map<string, {
	count: number;
	lastUsed: number;
	blockedUntil?: number;
}>();

// 오래된 엔트리 정리 (24시간 초과)
function pruneStaleEntries(): void {
	if (fireworksUsageMap.size <= MAX_MAP_SIZE) return;
	const cutoff = Date.now() - 24 * 60 * 60 * 1000;
	for (const [key, val] of fireworksUsageMap) {
		if (val.lastUsed < cutoff) fireworksUsageMap.delete(key);
	}
}

function canUseFireworks(sessionId: string): boolean {
	if (!process.env.FIREWORKS_API_KEY) return false;
	const entry = fireworksUsageMap.get(sessionId);
	const blockedUntil = entry?.blockedUntil ?? 0;
	if (blockedUntil > Date.now()) return false;
	const used = entry?.count ?? 0;
	return used < FIREWORKS_FREE_LIMIT;
}

function incrementFireworksUsage(sessionId: string): void {
	const entry = fireworksUsageMap.get(sessionId);
	const count = (entry?.count ?? 0) + 1;
	fireworksUsageMap.set(sessionId, { count, lastUsed: Date.now() });
	pruneStaleEntries();
}

function hasKimi(): boolean {
	return !!process.env.KIMI_API_KEY;
}

function hasFireworks(): boolean {
	return !!process.env.FIREWORKS_API_KEY;
}

function dedupeProviders(providers: Array<LLMProvider | null>): LLMProvider[] {
	return providers.filter((provider, index, list): provider is LLMProvider => {
		return !!provider && list.indexOf(provider) === index;
	});
}

function resolveTextProviders(sessionId: string): LLMProvider[] {
	// 정책 우선순위 #1: 기존 3회 룰 (신규/초기 사용자 체감 속도)
	if (canUseFireworks(sessionId)) {
		return dedupeProviders([
			"fireworks",
			hasKimi() ? "kimi" : null,
		]);
	}

	// 정책 우선순위 #2: 긴 입력도 고성능 Kimi로 처리
	if (hasKimi()) return ["kimi"];

	// 최후 폴백: 이용 가능한 provider가 fireworks뿐이면 제한 이후에도 사용
	if (hasFireworks()) return ["fireworks"];

	return [];
}

function resolveImageProviders(sessionId: string): LLMProvider[] {
	// 정책 우선순위 #1: 기존 3회 룰
	if (canUseFireworks(sessionId)) {
		return dedupeProviders([
			"fireworks",
			hasKimi() ? "kimi" : null,
		]);
	}

	// 이미지/긴 입력은 Kimi 우선
	if (hasKimi()) return ["kimi"];

	// 최후 폴백
	if (hasFireworks()) return ["fireworks"];

	return [];
}

function isRecoverableProviderFailure(message: string): boolean {
	const normalized = message.toLowerCase();

	return normalized.includes("llm 응답 시간 초과")
		|| normalized.includes("llmtimeouterror")
		|| normalized.includes("request was aborted")
		|| normalized.includes("fetch failed")
		|| normalized.includes("network")
		|| normalized.includes("connection")
		|| normalized.includes("response")
		|| normalized.includes("응답이 비어")
		|| normalized.includes("응답 형식")
		|| normalized.includes("파싱 결과가 비어")
		|| normalized.includes("unexpected end of json input")
		|| normalized.includes("rate limit")
		|| normalized.includes("429")
		|| normalized.includes("500")
		|| normalized.includes("502")
		|| normalized.includes("503")
		|| normalized.includes("504");
}

function activateFireworksCooldown(sessionId: string, reason: string): void {
	const entry = fireworksUsageMap.get(sessionId);
	const blockedUntil = Date.now() + FIREWORKS_FAILURE_COOLDOWN_MS;

	fireworksUsageMap.set(sessionId, {
		count: entry?.count ?? 0,
		lastUsed: Date.now(),
		blockedUntil,
	});
	pruneStaleEntries();

	console.warn("[LLM] fireworks cooldown activated", {
		reason,
		cooldownMs: FIREWORKS_FAILURE_COOLDOWN_MS,
	});
}

function normalizeParseFailure(
	result: UnifiedParseResponse,
	timeoutMs: number,
	isImage: boolean,
): UnifiedParseResponse {
	if (result.success) return result;

	if (
		result.error.includes("LLM 응답 시간 초과")
		|| result.error.includes("LLMTimeoutError")
	) {
		return { success: false, error: mapTimeoutErrorMessage(timeoutMs, isImage) };
	}

	return result;
}

function resolveTextTimeoutMs(input: string): number {
	const textLength = input.trim().length;
	if (textLength <= 100) return 45000;
	if (textLength <= 400) return 70000;
	return 100000;
}

function resolveImageTimeoutMs(textInput: string): number {
	const textLength = textInput.trim().length;
	if (textLength <= 100) return 90000;
	if (textLength <= 400) return 110000;
	return 120000;
}

function mapTimeoutErrorMessage(timeoutMs: number, isImage: boolean): string {
	if (isImage) {
		return `이미지 분석이 지연되고 있어요. (최대 ${Math.round(timeoutMs / 1000)}초)
이미지가 크거나 텍스트가 많으면 시간이 더 걸릴 수 있어요. 다시 시도해 주세요.`;
	}
	return `입력 분석이 지연되고 있어요. (최대 ${Math.round(timeoutMs / 1000)}초)
긴 입력은 시간이 더 걸릴 수 있어요. 잠시 후 다시 시도해 주세요.`;
}

function mapProviderConfigErrorMessage(): string {
	return "AI 파서 설정이 비어 있어요. 관리자에게 KIMI/FIREWORKS 키 설정을 요청해 주세요.";
}

// DB 조회: 사용자 LLM 카테고리
async function getUserLLMCategories(userId: string): Promise<LLMCategory[]> {
	const rows = await db
		.select({ name: categories.name, type: categories.type })
		.from(categories)
		.where(eq(categories.userId, userId));

	return rows.map((r) => ({ name: r.name, type: r.type }));
}

// DB 조회: 사용자 계정 (복호화 포함)
async function getUserAccounts(userId: string): Promise<Account[]> {
	const rows = await db
		.select()
		.from(accounts)
		.where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)));

	return rows.map((row) => ({
		id: row.id,
		userId: row.userId,
		name: decryptString(row.name),
		type: row.type,
		subType: row.subType,
		icon: row.icon,
		balance: decryptNumber(row.balance),
		sortOrder: row.sortOrder,
		isActive: row.isActive,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	}));
}

async function hasOpenSettlements(userId: string): Promise<boolean> {
	const rows = await db
		.select({ id: settlements.id })
		.from(settlements)
		.where(and(eq(settlements.userId, userId), ne(settlements.status, "completed")))
		.limit(1);

	return rows.length > 0;
}

/**
 * 코어 텍스트 파싱 — 세션 추출 없이 userId/sessionId를 직접 받는다.
 * Server Action과 API 라우트 모두에서 사용.
 */
export async function executeTextParse(
	input: string,
	userId: string,
	sessionId: string,
): Promise<UnifiedParseResponse> {
	if (!input.trim()) {
		return { success: false, error: "입력이 비어 있습니다." };
	}

	// 1단계 OOD 필터: 가계부와 무관한 입력 차단 (LLM 호출 전)
	if (!isFinancialInput(input)) {
		return { success: false, error: OOD_ERROR_MESSAGE };
	}

	// provider/timeout 결정
	const providers = resolveTextProviders(sessionId);
	const timeoutMs = resolveTextTimeoutMs(input);
	if (providers.length === 0) {
		return { success: false, error: mapProviderConfigErrorMessage() };
	}

	// 병렬로 카테고리 + 계정 + 열린 정산 여부 조회
	const [userCategories, existingAccounts, openSettlementExists] = await Promise.all([
		getUserLLMCategories(userId),
		getUserAccounts(userId),
		hasOpenSettlements(userId),
	]);

	// 은행 메시지 전처리
	const bankProcessedInput = isBankMessage(input) ? preprocessBankMessage(input) : input;
	const processedInput = preprocessSettlementTransferMessage(bankProcessedInput, {
		hasOpenSettlements: openSettlementExists,
	});

	let lastResult: UnifiedParseResponse | null = null;

	for (let index = 0; index < providers.length; index++) {
		const provider = providers[index];
		const result = await parseUnifiedText(
			processedInput,
			userCategories,
			existingAccounts,
			provider,
			{ timeoutMs },
		);

		if (result.success) {
			const matchedTransfers = await matchParsedSettlementTransfers(userId, result.settlementTransfers);
			if (provider === "fireworks") {
				incrementFireworksUsage(sessionId);
			}
			return {
				...result,
				settlementTransfers: matchedTransfers,
			};
		}

		lastResult = result;

		const fallbackProvider = providers[index + 1];
		const shouldFallback = provider === "fireworks" && fallbackProvider === "kimi";
		if (!shouldFallback) {
			break;
		}

		const isRecoverable = isRecoverableProviderFailure(result.error);
		if (isRecoverable) {
			activateFireworksCooldown(sessionId, result.error);
		}

		console.warn("[LLM] text provider fallback", {
			from: provider,
			to: fallbackProvider,
			recoverable: isRecoverable,
			error: result.error,
		});
	}

	return normalizeParseFailure(lastResult ?? { success: false, error: "파싱 실패: 알 수 없는 오류" }, timeoutMs, false);
}

/**
 * 코어 이미지 파싱 — 세션 추출 없이 userId/sessionId를 직접 받는다.
 * Server Action과 API 라우트 모두에서 사용.
 */
export async function executeImageParse(
	imageBase64: string,
	mimeType: string,
	textInput: string,
	userId: string,
	sessionId: string,
): Promise<UnifiedParseResponse> {
	if (!imageBase64) {
		return { success: false, error: "이미지가 비어 있습니다." };
	}

	// provider/timeout 결정
	const providers = resolveImageProviders(sessionId);
	const timeoutMs = resolveImageTimeoutMs(textInput);
	if (providers.length === 0) {
		return { success: false, error: mapProviderConfigErrorMessage() };
	}

	const [userCategories, existingAccounts, openSettlementExists] = await Promise.all([
		getUserLLMCategories(userId),
		getUserAccounts(userId),
		hasOpenSettlements(userId),
	]);
	const processedTextInput = preprocessSettlementTransferMessage(textInput, {
		hasOpenSettlements: openSettlementExists,
	});

	let lastResult: UnifiedParseResponse | null = null;

	for (let index = 0; index < providers.length; index++) {
		const provider = providers[index];
		const result = await parseUnifiedImage(
			imageBase64,
			mimeType,
			processedTextInput,
			userCategories,
			existingAccounts,
			provider,
			{ timeoutMs },
		);

		if (result.success) {
			const matchedTransfers = await matchParsedSettlementTransfers(userId, result.settlementTransfers);
			if (provider === "fireworks") {
				incrementFireworksUsage(sessionId);
			}
			return {
				...result,
				settlementTransfers: matchedTransfers,
			};
		}

		lastResult = result;

		const fallbackProvider = providers[index + 1];
		const shouldFallback = provider === "fireworks" && fallbackProvider === "kimi";
		if (!shouldFallback) {
			break;
		}

		const isRecoverable = isRecoverableProviderFailure(result.error);
		if (isRecoverable) {
			activateFireworksCooldown(sessionId, result.error);
		}

		console.warn("[LLM] image provider fallback", {
			from: provider,
			to: fallbackProvider,
			recoverable: isRecoverable,
			error: result.error,
		});
	}

	return normalizeParseFailure(lastResult ?? { success: false, error: "이미지 파싱 실패: 알 수 없는 오류" }, timeoutMs, true);
}
