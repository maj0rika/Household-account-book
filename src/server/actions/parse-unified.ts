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

function resolveProvider(sessionId: string): LLMProvider {
	if (!process.env.FIREWORKS_API_KEY) return "kimi";

	const entry = fireworksUsageMap.get(sessionId);
	const used = entry?.count ?? 0;
	if (used < FIREWORKS_FREE_LIMIT) return "fireworks";
	return "kimi";
}

function incrementFireworksUsage(sessionId: string): void {
	const entry = fireworksUsageMap.get(sessionId);
	const count = (entry?.count ?? 0) + 1;
	fireworksUsageMap.set(sessionId, { count, lastUsed: Date.now() });
	pruneStaleEntries();
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

	// provider 결정 (Fireworks 3회 → Kimi 폴백)
	const provider = resolveProvider(session.session.id);

	// 병렬로 카테고리 + 계정 조회
	const [userCategories, existingAccounts] = await Promise.all([
		getUserLLMCategories(session.user.id),
		getUserAccounts(session.user.id),
	]);

	// 은행 메시지 전처리
	const processedInput = isBankMessage(input)
		? preprocessBankMessage(input)
		: input;

	const result = await parseUnifiedText(processedInput, userCategories, existingAccounts, provider);

	// 성공 시에만 카운터 증가 (실패하면 횟수 소비하지 않음)
	if (result.success && provider === "fireworks") {
		incrementFireworksUsage(session.session.id);
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

	// provider 결정
	const provider = resolveProvider(session.session.id);

	const [userCategories, existingAccounts] = await Promise.all([
		getUserLLMCategories(session.user.id),
		getUserAccounts(session.user.id),
	]);

	const result = await parseUnifiedImage(imageBase64, mimeType, textInput, userCategories, existingAccounts, provider);

	if (result.success && provider === "fireworks") {
		incrementFireworksUsage(session.session.id);
	}

	return result;
}
