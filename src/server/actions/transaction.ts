"use server";

import { headers } from "next/headers";
import { and, eq, gte, lt, sql, desc } from "drizzle-orm";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { transactions, categories } from "@/server/db/schema";
import type { ParsedTransaction } from "@/server/llm/types";
import type { Transaction, MonthlySummary } from "@/types";

async function getAuthUserId(): Promise<string> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session?.user?.id) {
		throw new Error("인증이 필요합니다.");
	}
	return session.user.id;
}

export async function createTransactions(
	items: ParsedTransaction[],
	originalInput: string,
): Promise<{ success: true; count: number } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		// 사용자의 카테고리 맵 조회
		const userCategories = await db
			.select({ id: categories.id, name: categories.name, type: categories.type })
			.from(categories)
			.where(eq(categories.userId, userId));

		const categoryMap = new Map(userCategories.map((c) => [`${c.type}:${c.name}`, c.id]));

		const values = items.map((item) => ({
			userId,
			categoryId: categoryMap.get(`${item.type}:${item.category}`) ?? null,
			type: item.type as "income" | "expense",
			amount: item.amount,
			description: item.description,
			originalInput,
			date: item.date,
		}));

		await db.insert(transactions).values(values);

		return { success: true, count: items.length };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "저장에 실패했습니다." };
	}
}

export async function getTransactions(month: string): Promise<Transaction[]> {
	const userId = await getAuthUserId();

	const startDate = `${month}-01`;
	const [year, m] = month.split("-").map(Number);
	const nextMonth = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, "0")}-01`;

	const rows = await db
		.select({
			id: transactions.id,
			userId: transactions.userId,
			categoryId: transactions.categoryId,
			type: transactions.type,
			amount: transactions.amount,
			description: transactions.description,
			originalInput: transactions.originalInput,
			date: transactions.date,
			memo: transactions.memo,
			createdAt: transactions.createdAt,
			updatedAt: transactions.updatedAt,
			categoryName: categories.name,
			categoryIcon: categories.icon,
			categoryType: categories.type,
		})
		.from(transactions)
		.leftJoin(categories, eq(transactions.categoryId, categories.id))
		.where(
			and(
				eq(transactions.userId, userId),
				gte(transactions.date, startDate),
				lt(transactions.date, nextMonth),
			),
		)
		.orderBy(desc(transactions.date), desc(transactions.createdAt));

	return rows.map((row) => ({
		id: row.id,
		userId: row.userId,
		categoryId: row.categoryId,
		type: row.type,
		amount: row.amount,
		description: row.description,
		originalInput: row.originalInput,
		date: row.date,
		memo: row.memo,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		category: row.categoryName
			? {
					id: row.categoryId!,
					name: row.categoryName,
					icon: row.categoryIcon!,
					type: row.categoryType!,
				}
			: null,
	}));
}

export async function getMonthlySummary(month: string): Promise<MonthlySummary> {
	const userId = await getAuthUserId();

	const startDate = `${month}-01`;
	const [year, m] = month.split("-").map(Number);
	const nextMonth = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, "0")}-01`;

	const result = await db
		.select({
			type: transactions.type,
			total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
		})
		.from(transactions)
		.where(
			and(
				eq(transactions.userId, userId),
				gte(transactions.date, startDate),
				lt(transactions.date, nextMonth),
			),
		)
		.groupBy(transactions.type);

	let income = 0;
	let expense = 0;
	for (const row of result) {
		if (row.type === "income") income = Number(row.total);
		if (row.type === "expense") expense = Number(row.total);
	}

	return { income, expense, balance: income - expense };
}

export async function deleteTransaction(
	id: string,
): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		const result = await db
			.delete(transactions)
			.where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

		if (result.rowCount === 0) {
			return { success: false, error: "거래를 찾을 수 없습니다." };
		}

		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "삭제에 실패했습니다." };
	}
}

export async function getUserCategories() {
	const userId = await getAuthUserId();

	return db
		.select()
		.from(categories)
		.where(eq(categories.userId, userId))
		.orderBy(categories.sortOrder);
}

export async function createSingleTransaction(data: {
	type: "income" | "expense";
	categoryId: string | null;
	description: string;
	amount: number;
	date: string;
	memo?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		await db.insert(transactions).values({
			userId,
			categoryId: data.categoryId,
			type: data.type,
			amount: data.amount,
			description: data.description,
			date: data.date,
			memo: data.memo ?? null,
		});

		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "저장에 실패했습니다." };
	}
}
