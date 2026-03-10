"use server";

import { and, eq } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";

import { getAuthUserIdOrThrow } from "@/server/auth";
import { db } from "@/server/db";
import { authAccounts, authUsers, categories } from "@/server/db/schema";
import { revalidateCategoryPages } from "@/lib/cache-keys";

const getAuthUserId = getAuthUserIdOrThrow;

export async function addCategory(data: {
	name: string;
	icon: string;
	type: "income" | "expense";
}): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		// 기존 카테고리 수 조회 (sortOrder용)
		const existing = await db
			.select({ id: categories.id })
			.from(categories)
			.where(and(eq(categories.userId, userId), eq(categories.type, data.type)));

		await db.insert(categories).values({
			userId,
			name: data.name,
			icon: data.icon,
			type: data.type,
			sortOrder: existing.length,
			isDefault: false,
		});

		revalidateCategoryPages();
		return { success: true };
	} catch (e) {
		const msg = e instanceof Error ? e.message : "카테고리 추가에 실패했습니다.";
		if (msg.includes("unique") || msg.includes("duplicate")) {
			return { success: false, error: "이미 같은 이름의 카테고리가 있습니다." };
		}
		return { success: false, error: msg };
	}
}

export async function deleteCategory(
	id: string,
): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		await db
			.delete(categories)
			.where(and(eq(categories.id, id), eq(categories.userId, userId)));

		revalidateCategoryPages();
		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "카테고리 삭제에 실패했습니다." };
	}
}

// 사용자 계정 삭제 — 비밀번호 검증 후 사용자 삭제 (CASCADE로 전체 데이터 삭제)
export async function deleteUserAccount(
	password: string,
): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		// credential 계정에서 해시된 비밀번호 조회
		const [account] = await db
			.select({ password: authAccounts.password })
			.from(authAccounts)
			.where(
				and(
					eq(authAccounts.userId, userId),
					eq(authAccounts.providerId, "credential"),
				),
			);

		if (!account?.password) {
			return { success: false, error: "계정 정보를 찾을 수 없습니다." };
		}

		const isValid = await verifyPassword({
			hash: account.password,
			password,
		});

		if (!isValid) {
			return { success: false, error: "비밀번호가 일치하지 않습니다." };
		}

		// 사용자 삭제 — CASCADE로 sessions, accounts, categories, transactions 등 전부 삭제
		await db.delete(authUsers).where(eq(authUsers.id, userId));

		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "계정 삭제에 실패했습니다." };
	}
}
