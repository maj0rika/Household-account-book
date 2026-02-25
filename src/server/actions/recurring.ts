"use server";

import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { recurringTransactions, transactions } from "@/server/db/schema";

async function getAuthUserId(): Promise<string> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session?.user?.id) {
		throw new Error("인증이 필요합니다.");
	}
	return session.user.id;
}

export async function getRecurringTransactions() {
	const userId = await getAuthUserId();

	return db
		.select()
		.from(recurringTransactions)
		.where(eq(recurringTransactions.userId, userId))
		.orderBy(recurringTransactions.dayOfMonth);
}

export async function createRecurringTransaction(data: {
	type: "income" | "expense";
	categoryId: string | null;
	description: string;
	amount: number;
	dayOfMonth: number;
}): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		await db.insert(recurringTransactions).values({
			userId,
			categoryId: data.categoryId,
			type: data.type,
			amount: data.amount,
			description: data.description,
			dayOfMonth: data.dayOfMonth,
		});

		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "저장에 실패했습니다." };
	}
}

export async function deleteRecurringTransaction(
	id: string,
): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		await db
			.delete(recurringTransactions)
			.where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)));

		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "삭제에 실패했습니다." };
	}
}

export async function applyRecurringTransactions(
	month: string,
): Promise<{ success: true; count: number } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		const recurring = await db
			.select()
			.from(recurringTransactions)
			.where(
				and(
					eq(recurringTransactions.userId, userId),
					eq(recurringTransactions.isActive, true),
				),
			);

		if (recurring.length === 0) {
			return { success: true, count: 0 };
		}

		const [year, m] = month.split("-").map(Number);
		const daysInMonth = new Date(year, m, 0).getDate();

		const values = recurring.map((r) => {
			const day = Math.min(r.dayOfMonth, daysInMonth);
			const date = `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
			return {
				userId,
				categoryId: r.categoryId,
				type: r.type,
				amount: r.amount,
				description: r.description,
				date,
				memo: "고정 거래 자동 생성",
			};
		});

		await db.insert(transactions).values(values);

		return { success: true, count: values.length };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "적용에 실패했습니다." };
	}
}
