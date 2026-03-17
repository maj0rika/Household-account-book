// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LLM 파싱 코어 — 사용자 입력(text/image)을 가계부 데이터로 변환하는 중앙 파이프라인.
//
// 데이터 흐름:
//   입력 → OOD 필터(무관 입력 차단) → 은행 메시지 전처리 → provider 결정
//   → DB에서 카테고리/계좌 병렬 조회 → LLM 호출
//   → 텍스트: MiniMax 우선, Fireworks 폴백 / 이미지: Fireworks 우선, 3회 초과 시 Kimi
//   → 응답 정규화 → UnifiedParseResponse 반환
//
// 주요 설계 결정:
//   - 100자 이하 짧은 텍스트는 MiniMax → Fireworks 순서로 처리
//   - 이미지는 세션별 Fireworks 3회 후 Kimi 전환 (기존 정책 유지)
//   - 이미지 Fireworks 장애 provider 10분 쿨다운 (낭비 방지)
//   - 성공 응답만 usage 차감 (장애에 의한 할당 소진 방지)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { categories, accounts } from "@/server/db/schema";
import { decryptString, decryptNumber } from "@/server/lib/crypto";
import { parseUnifiedText, parseUnifiedImage } from "@/server/llm";
import type { LLMProvider } from "@/server/llm/client";
import { isBankMessage, preprocessBankMessage } from "@/server/llm/bank-message";
import { isFinancialInput, OOD_ERROR_MESSAGE } from "@/server/llm/ood-filter";
import type { LLMCategory } from "@/server/llm/prompt";
import type { UnifiedParseResponse } from "@/server/llm/types";
import type { Account } from "@/types";

const SHORT_TEXT_PROVIDER_THRESHOLD = 500; // "단순 텍스트" 판별 기준

// 세션별 이미지 Fireworks 사용 카운터 (인메모리)
// key: sessionId, value: { count, lastUsed }
// 로그아웃 → 재로그인 시 새 세션 ID가 발급되므로 자동 리셋
// 인메모리 — 서버 재시작 시 초기화됨 (엄격한 제한 필요 시 Redis/DB 전환)
const IMAGE_FIREWORKS_FREE_LIMIT = 3; // 세션당 이미지 Fireworks 우선 호출 횟수
const MAX_MAP_SIZE = 1000; // 메모리 누수 방지용 상한
const IMAGE_FIREWORKS_FAILURE_COOLDOWN_MS = 10 * 60 * 1000; // 장애 후 10분간 해당 세션에서 회피
const imageFireworksUsageMap = new Map<
	string,
	{
		count: number; // 성공 응답 누적 횟수
		lastUsed: number; // 마지막 사용 타임스탬프 (prune 기준)
		blockedUntil?: number; // 쿨다운 해제 시각 (장애 시 설정)
	}
>();

// 오래된 엔트리 정리 (24시간 초과)
function pruneStaleImageFireworksEntries(): void {
	if (imageFireworksUsageMap.size <= MAX_MAP_SIZE) return;
	const cutoff = Date.now() - 24 * 60 * 60 * 1000;
	for (const [key, val] of imageFireworksUsageMap) {
		if (val.lastUsed < cutoff) imageFireworksUsageMap.delete(key);
	}
}

function hasMiniMax(): boolean {
	return !!process.env.MINIMAX_API_KEY;
}

function canUseImageFireworks(sessionId: string): boolean {
	if (!hasFireworks()) return false;
	const entry = imageFireworksUsageMap.get(sessionId);
	const blockedUntil = entry?.blockedUntil ?? 0;
	if (blockedUntil > Date.now()) return false;
	const used = entry?.count ?? 0;
	return used < IMAGE_FIREWORKS_FREE_LIMIT;
}

function incrementImageFireworksUsage(sessionId: string): void {
	const entry = imageFireworksUsageMap.get(sessionId);
	const count = (entry?.count ?? 0) + 1;
	imageFireworksUsageMap.set(sessionId, { count, lastUsed: Date.now() });
	pruneStaleImageFireworksEntries();
}

function hasKimi(): boolean {
	return !!process.env.KIMI_API_KEY;
}

function hasFireworks(): boolean {
	return !!process.env.FIREWORKS_API_KEY;
}

// null 제거 + 중복 제거 — provider 배열을 안전하게 정리
function dedupeProviders(providers: Array<LLMProvider | null>): LLMProvider[] {
	return providers.filter((provider, index, list): provider is LLMProvider => {
		return !!provider && list.indexOf(provider) === index;
	});
}

function resolveTextProviders(input: string): LLMProvider[] {
	const textLength = input.trim().length;

	// 100자 이하 짧은 텍스트는 MiniMax를 우선 시도하고 실패 시 Fireworks로 폴백한다.
	if (textLength <= SHORT_TEXT_PROVIDER_THRESHOLD) {
		return dedupeProviders([
			hasMiniMax() ? "minimax" : null,
			hasFireworks() ? "fireworks" : null,
			!hasMiniMax() && !hasFireworks() && hasKimi() ? "kimi" : null,
		]);
	}

	// 긴 입력/복수 거래는 기존 고성능 Kimi 경로를 유지한다.
	if (hasKimi()) return ["kimi"];

	// Kimi가 없으면 Fireworks, 둘 다 없으면 MiniMax로 마지막 폴백을 건다.
	if (hasFireworks()) return ["fireworks"];
	if (hasMiniMax()) return ["minimax"];

	return [];
}

function resolveImageProviders(sessionId: string): LLMProvider[] {
	// 정책 우선순위 #1: 기존 3회 룰
	if (canUseImageFireworks(sessionId)) {
		return dedupeProviders(["fireworks", hasKimi() ? "kimi" : null]);
	}

	// 이미지/긴 입력은 Kimi 우선
	if (hasKimi()) return ["kimi"];

	// 최후 폴백
	if (hasFireworks()) return ["fireworks"];

	return [];
}

// 폴백을 시도할 가치가 있는 실패인지 판단
// true: 타임아웃/네트워크/서버 오류 → 다른 provider로 재시도
// false: 콘텐츠 오류/입력 오류 → 다른 provider로도 같은 결과이므로 즉시 중단
function isRecoverableProviderFailure(message: string): boolean {
	const normalized = message.toLowerCase();

	return (
		normalized.includes("llm 응답 시간 초과") ||
		normalized.includes("llmtimeouterror") ||
		normalized.includes("request was aborted") ||
		normalized.includes("fetch failed") ||
		normalized.includes("network") ||
		normalized.includes("connection") ||
		normalized.includes("forbidden") ||
		normalized.includes("response") ||
		normalized.includes("응답이 비어") ||
		normalized.includes("응답 형식") ||
		normalized.includes("파싱 결과가 비어") ||
		normalized.includes("unexpected end of json input") ||
		normalized.includes("rate limit") ||
		normalized.includes("401") ||
		normalized.includes("403") ||
		normalized.includes("429") ||
		normalized.includes("500") ||
		normalized.includes("502") ||
		normalized.includes("503") ||
		normalized.includes("504")
	);
}

function activateImageFireworksCooldown(sessionId: string, reason: string): void {
	const entry = imageFireworksUsageMap.get(sessionId);
	const blockedUntil = Date.now() + IMAGE_FIREWORKS_FAILURE_COOLDOWN_MS;

	imageFireworksUsageMap.set(sessionId, {
		count: entry?.count ?? 0,
		lastUsed: Date.now(),
		blockedUntil,
	});
	pruneStaleImageFireworksEntries();

	console.warn("[LLM] fireworks cooldown activated", {
		reason,
		cooldownMs: IMAGE_FIREWORKS_FAILURE_COOLDOWN_MS,
	});
}

// LLM 내부 에러 메시지를 사용자 친화적 메시지로 변환
// (LLMTimeoutError 같은 기술적 메시지가 사용자에게 노출되는 것을 방지)
function normalizeParseFailure(
	result: UnifiedParseResponse,
	timeoutMs: number,
	isImage: boolean,
): UnifiedParseResponse {
	if (result.success) return result;

	if (result.error.includes("LLM 응답 시간 초과") || result.error.includes("LLMTimeoutError")) {
		return { success: false, error: mapTimeoutErrorMessage(timeoutMs, isImage) };
	}

	return result;
}

// 입력 길이에 따른 단계별 타임아웃 — 짧은 입력에 긴 타임아웃을 주면 UX 저하
function resolveTextTimeoutMs(input: string): number {
	const textLength = input.trim().length;
	if (textLength <= SHORT_TEXT_PROVIDER_THRESHOLD) return 45000; // ~45s: 단순 입력 ("CU 3500")
	if (textLength <= 400) return 70000; // ~70s: 중간 길이
	return 100000; // ~100s: 긴 입력/복수 거래
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
	return "AI 파서 설정이 비어 있어요. 관리자에게 MINIMAX/FIREWORKS/KIMI 키 설정을 요청해 주세요.";
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

// 코어 텍스트 파싱 — Server Action / API 라우트 공용
// OOD 필터 → 카테고리·계좌 병렬 조회 → provider 순차 폴백
export async function executeTextParse(
	input: string,
	userId: string,
	sessionId: string,
): Promise<UnifiedParseResponse> {
	if (!input.trim()) {
		return { success: false, error: "입력이 비어 있습니다." };
	}

	// 1단계 OOD 필터: 가계부와 무관한 입력 차단 (LLM 호출 전 비용 절감)
	if (!isFinancialInput(input)) {
		return { success: false, error: OOD_ERROR_MESSAGE };
	}

	// provider(AI 제공자) 및 timeout(제한 시간) 결정
	const providers = resolveTextProviders(input);
	const timeoutMs = resolveTextTimeoutMs(input);
	if (providers.length === 0) {
		return { success: false, error: mapProviderConfigErrorMessage() };
	}

	// [성능 최적화] 병렬로 카테고리 + 계정 조회
	const [userCategories, existingAccounts] = await Promise.all([
		getUserLLMCategories(userId),
		getUserAccounts(userId),
	]);

	// 은행 메시지 전처리 (불필요한 공백이나 특수문자 제거)
	const processedInput = isBankMessage(input) ? preprocessBankMessage(input) : input;

	let lastResult: UnifiedParseResponse | null = null;

	// 우선순위 순서대로 provider를 시도하고 실패 시 폴백
	for (let index = 0; index < providers.length; index++) {
		const provider = providers[index];
		// providers는 "우선 시도 → 실패 시 폴백" 순서다.
		// 여기서만 순차 실행해야 timeout/로그/쿨다운 상태를 요청 단위로 일관되게 남길 수 있다.
		const result = await parseUnifiedText(
			processedInput,
			userCategories,
			existingAccounts,
			provider,
			{ timeoutMs },
		);

		if (result.success) {
			return result;
		}

		lastResult = result;

		const fallbackProvider = providers[index + 1];
		const shouldFallback =
			!!fallbackProvider &&
			((provider === "minimax" && fallbackProvider === "fireworks") ||
				(provider === "fireworks" && fallbackProvider === "kimi"));
		if (!shouldFallback) {
			break;
		}

		const isRecoverable = isRecoverableProviderFailure(result.error);
		if (provider === "fireworks" && fallbackProvider === "kimi" && isRecoverable) {
			// 복구 가능한 실패만 쿨다운을 걸어 다음 요청부터 바로 Kimi를 우선 사용하게 한다.
			// 사용량 제한과 별개로 "실패가 반복되는 벤더"를 잠시 우회하는 안전장치다.
			activateImageFireworksCooldown(sessionId, result.error);
		}

		console.warn("[LLM] text provider fallback", {
			from: provider,
			to: fallbackProvider,
			recoverable: isRecoverable,
			error: result.error,
		});
	}

	return normalizeParseFailure(
		lastResult ?? { success: false, error: "파싱 실패: 알 수 없는 오류" },
		timeoutMs,
		false,
	);
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

	const [userCategories, existingAccounts] = await Promise.all([
		getUserLLMCategories(userId),
		getUserAccounts(userId),
	]);

	let lastResult: UnifiedParseResponse | null = null;

	for (let index = 0; index < providers.length; index++) {
		const provider = providers[index];
		// 이미지도 텍스트와 같은 폴백 규칙을 따르되, 전처리 비용이 큰 만큼 동일 payload를 재활용한다.
		const result = await parseUnifiedImage(
			imageBase64,
			mimeType,
			textInput,
			userCategories,
			existingAccounts,
			provider,
			{ timeoutMs },
		);

		if (result.success) {
			if (provider === "fireworks") {
				incrementImageFireworksUsage(sessionId);
			}
			return result;
		}

		lastResult = result;

		const fallbackProvider = providers[index + 1];
		const shouldFallback = provider === "fireworks" && fallbackProvider === "kimi";
		if (!shouldFallback) {
			break;
		}

		const isRecoverable = isRecoverableProviderFailure(result.error);
		if (isRecoverable) {
			activateImageFireworksCooldown(sessionId, result.error);
		}

		console.warn("[LLM] image provider fallback", {
			from: provider,
			to: fallbackProvider,
			recoverable: isRecoverable,
			error: result.error,
		});
	}

	return normalizeParseFailure(
		lastResult ?? { success: false, error: "이미지 파싱 실패: 알 수 없는 오류" },
		timeoutMs,
		true,
	);
}
