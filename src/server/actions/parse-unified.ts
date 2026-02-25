"use server";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { categories, accounts } from "@/server/db/schema";
import { parseUnifiedText, parseUnifiedImage } from "@/server/llm";
import { isBankMessage, preprocessBankMessage } from "@/server/llm/bank-message";
import type { LLMCategory } from "@/server/llm/prompt";
import type { UnifiedParseResponse } from "@/server/llm/types";
import type { Account } from "@/types";

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

	// 병렬로 카테고리 + 계정 조회
	const [userCategories, existingAccounts] = await Promise.all([
		getUserLLMCategories(session.user.id),
		getUserAccounts(session.user.id),
	]);

	// 은행 메시지 전처리
	const processedInput = isBankMessage(input)
		? preprocessBankMessage(input)
		: input;

	return parseUnifiedText(processedInput, userCategories, existingAccounts);
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

	const [userCategories, existingAccounts] = await Promise.all([
		getUserLLMCategories(session.user.id),
		getUserAccounts(session.user.id),
	]);

	return parseUnifiedImage(imageBase64, mimeType, textInput, userCategories, existingAccounts);
}
