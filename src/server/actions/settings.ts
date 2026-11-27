"use server";

import { and, eq } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";

import { getAuthUserIdOrThrow, getServerSession } from "@/server/auth";
import { db } from "@/server/db";
import { authAccounts, authUsers, categories } from "@/server/db/schema";
import { revalidateCategoryPages } from "@/lib/cache-keys";
import { DEMO_ACCOUNT_BLOCKED_MESSAGE, isDemoAccountEmail } from "@/server/security/demo-account";
import {
	addCategorySchema,
	deleteUserAccountSchema,
	firstSchemaError,
	sanitizeActionError,
	uuidSchema,
} from "@/server/validation/write-schemas";

const getAuthUserId = getAuthUserIdOrThrow;

function isUniqueConstraintError(error: unknown): boolean {
	if (typeof error === "object" && error !== null) {
		const err = error as { code?: string; cause?: { code?: string } };
		if (err.code === "23505" || err.cause?.code === "23505") {
			return true;
		}
	}
	if (error instanceof Error) {
		const msg = error.message.toLowerCase();
		return msg.includes("unique") || msg.includes("duplicate");
	}
	return false;
}

export async function addCategory(data: {
	name: string;
	icon: string;
	type: "income" | "expense";
}): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const parsed = addCategorySchema.safeParse(data);
		if (!parsed.success) {
			return { success: false, error: firstSchemaError(parsed.error) };
		}
		data = parsed.data;
		const userId = await getAuthUserId();

		// 현재는 카테고리 정렬 UI가 없어서
		// 새 카테고리를 같은 유형 목록의 마지막 순서로 붙이는 정책을 유지한다.
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

		revalidateCategoryPages(userId);
		return { success: true };
	} catch (e) {
		if (isUniqueConstraintError(e)) {
			return { success: false, error: "이미 같은 이름의 카테고리가 있습니다." };
		}
		return { success: false, error: sanitizeActionError(e, "카테고리 추가에 실패했습니다.") };
	}
}

export async function deleteCategory(
	id: string,
): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const parsedId = uuidSchema.safeParse(id);
		if (!parsedId.success) {
			return { success: false, error: firstSchemaError(parsedId.error) };
		}
		const userId = await getAuthUserId();

		await db
			.delete(categories)
			.where(and(eq(categories.id, parsedId.data), eq(categories.userId, userId)));

		revalidateCategoryPages(userId);
		return { success: true };
	} catch (e) {
		return { success: false, error: sanitizeActionError(e, "카테고리 삭제에 실패했습니다.") };
	}
}

// 사용자 계정 삭제 — 비밀번호 검증 후 사용자 삭제 (CASCADE로 전체 데이터 삭제)
export async function deleteUserAccount(
	password: string,
): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const parsedPassword = deleteUserAccountSchema.safeParse(password);
		if (!parsedPassword.success) {
			return { success: false, error: firstSchemaError(parsedPassword.error) };
		}
		const userId = await getAuthUserId();
		const session = await getServerSession();
		if (isDemoAccountEmail(session?.user.email)) {
			return { success: false, error: DEMO_ACCOUNT_BLOCKED_MESSAGE };
		}

		// 계정 삭제는 되돌릴 수 없는 작업이라
		// Better Auth credential 해시를 다시 검증한 뒤에만 최종 삭제로 내려간다.
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
			password: parsedPassword.data,
		});

		if (!isValid) {
			return { success: false, error: "비밀번호가 일치하지 않습니다." };
		}

		// 실제 삭제는 authUsers 한 건만 제거하고,
		// 세션/카테고리/거래/자산 데이터 정리는 FK CASCADE에 맡긴다.
		// 사용자 삭제 — CASCADE로 sessions, accounts, categories, transactions 등 전부 삭제
		await db.delete(authUsers).where(eq(authUsers.id, userId));

		return { success: true };
	} catch (e) {
		return { success: false, error: sanitizeActionError(e, "계정 삭제에 실패했습니다.") };
	}
}
