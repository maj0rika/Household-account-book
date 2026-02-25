"use server";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema";

async function getAuthUserId(): Promise<string> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session?.user?.id) {
		throw new Error("인증이 필요합니다.");
	}
	return session.user.id;
}

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

		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "카테고리 삭제에 실패했습니다." };
	}
}
