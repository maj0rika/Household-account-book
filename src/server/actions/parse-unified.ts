"use server";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { categories, accounts } from "@/server/db/schema";
import { parseUnifiedText, parseUnifiedImage } from "@/server/llm";
import type { LLMProvider } from "@/server/llm/client";
import { isBankMessage, preprocessBankMessage } from "@/server/llm/bank-message";
import { isFinancialInput, OOD_ERROR_MESSAGE } from "@/server/llm/ood-filter";
import type { LLMCategory } from "@/server/llm/prompt";
import type { UnifiedParseResponse } from "@/server/llm/types";
import type { Account } from "@/types";

// 세션별 Fireworks 사용 카운터 (인메모리)
// key: sessionId, value: { count, lastUsed }
// 로그아웃 → 재로그인 시 새 세션 ID가 발급되므로 자동 리셋
const FIREWORKS_FREE_LIMIT = 3;
const MAX_MAP_SIZE = 1000;
const fireworksUsageMap = new Map<string, { count: number; lastUsed: number }>();

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
	const used = entry?.count ?? 0;
	return used < FIREWORKS_FREE_LIMIT;
}

function incrementFireworksUsage(sessionId: string): void {
	const entry = fireworksUsageMap.get(sessionId);
	const count = (entry?.count ?? 0) + 1;
	fireworksUsageMap.set(sessionId, { count, lastUsed: Date.now() });
	pruneStaleEntries();
}

function resolveTextProvider(input: string, sessionId: string): LLMProvider | null {
	// 정책 우선순위 #1: 기존 3회 룰 (신규/초기 사용자 체감 속도)
	if (canUseFireworks(sessionId)) {
		return "fireworks";
	}

	// 정책 우선순위 #2: 긴 입력도 고성능 Kimi로 처리
	if (process.env.KIMI_API_KEY) return "kimi";

	// 최후 폴백: 이용 가능한 provider가 fireworks뿐이면 제한 이후에도 사용
	if (process.env.FIREWORKS_API_KEY) return "fireworks";

	return null;
}

function resolveImageProvider(sessionId: string): LLMProvider | null {
	// 정책 우선순위 #1: 기존 3회 룰
	if (canUseFireworks(sessionId)) return "fireworks";

	// 이미지/긴 입력은 Kimi 우선
	if (process.env.KIMI_API_KEY) return "kimi";

	// 최후 폴백
	if (process.env.FIREWORKS_API_KEY) return "fireworks";

	return null;
}

function resolveTextTimeoutMs(input: string): number {
	const textLength = input.trim().length;
	if (textLength <= 100) return 25000;
	if (textLength <= 400) return 45000;
	return 75000;
}

function resolveImageTimeoutMs(textInput: string): number {
	const textLength = textInput.trim().length;
	if (textLength <= 100) return 70000;
	if (textLength <= 400) return 85000;
	return 100000;
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

async function getUserLLMCategories(userId: string): Promise<LLMCategory[]> {
	const rows = await db
		.select({ name: categories.name, type: categories.type })
		.from(categories)
		.where(eq(categories.userId, userId));

	return rows.map((r) => ({ name: r.name, type: r.type }));
}

async function getUserAccounts(userId: string): Promise<Account[]> {
	const rows = await db
		.select()
		.from(accounts)
		.where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)));

	return rows.map((row) => ({
		id: row.id,
		userId: row.userId,
		name: row.name,
		type: row.type,
		subType: row.subType,
		icon: row.icon,
		balance: row.balance,
		sortOrder: row.sortOrder,
		isActive: row.isActive,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	}));
}

export async function parseUnifiedInput(input: string): Promise<UnifiedParseResponse> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		return { success: false, error: "인증이 필요합니다." };
	}

	if (!input.trim()) {
		return { success: false, error: "입력이 비어 있습니다." };
	}

	// 1단계 OOD 필터: 가계부와 무관한 입력 차단 (LLM 호출 전)
	if (!isFinancialInput(input)) {
		return { success: false, error: OOD_ERROR_MESSAGE };
	}

	// provider/timeout 결정
	const provider = resolveTextProvider(input, session.session.id);
	const timeoutMs = resolveTextTimeoutMs(input);
	if (!provider) {
		return { success: false, error: mapProviderConfigErrorMessage() };
	}

	// 병렬로 카테고리 + 계정 조회
	const [userCategories, existingAccounts] = await Promise.all([
		getUserLLMCategories(session.user.id),
		getUserAccounts(session.user.id),
	]);

	// 은행 메시지 전처리
	const processedInput = isBankMessage(input) ? preprocessBankMessage(input) : input;

	const result = await parseUnifiedText(
		processedInput,
		userCategories,
		existingAccounts,
		provider,
		{ timeoutMs },
	);

	// 성공 시에만 카운터 증가 (실패하면 횟수 소비하지 않음)
	if (result.success && provider === "fireworks") {
		incrementFireworksUsage(session.session.id);
	}

	if (!result.success) {
		// LLMTimeoutError가 에러 메시지에 래핑되어 있을 수 있으므로, 타임아웃 에러를 사용자 친화적 메시지로 변환
		if (
			result.error.includes("LLM 응답 시간 초과") ||
			result.error.includes("LLMTimeoutError")
		) {
			return { success: false, error: mapTimeoutErrorMessage(timeoutMs, false) };
		}
	}

	return result;
}

export async function parseUnifiedImageInput(
	imageBase64: string,
	mimeType: string,
	textInput: string,
): Promise<UnifiedParseResponse> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		return { success: false, error: "인증이 필요합니다." };
	}

	if (!imageBase64) {
		return { success: false, error: "이미지가 비어 있습니다." };
	}

	// provider/timeout 결정
	const provider = resolveImageProvider(session.session.id);
	const timeoutMs = resolveImageTimeoutMs(textInput);
	if (!provider) {
		return { success: false, error: mapProviderConfigErrorMessage() };
	}

	const [userCategories, existingAccounts] = await Promise.all([
		getUserLLMCategories(session.user.id),
		getUserAccounts(session.user.id),
	]);

	const result = await parseUnifiedImage(
		imageBase64,
		mimeType,
		textInput,
		userCategories,
		existingAccounts,
		provider,
		{ timeoutMs },
	);

	if (result.success && provider === "fireworks") {
		incrementFireworksUsage(session.session.id);
	}

	if (!result.success) {
		if (
			result.error.includes("LLM 응답 시간 초과") ||
			result.error.includes("LLMTimeoutError")
		) {
			return { success: false, error: mapTimeoutErrorMessage(timeoutMs, true) };
		}
	}

	return result;
}
