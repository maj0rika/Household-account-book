"use server";

import { headers } from "next/headers";
import { and, eq, gte, lt, sql } from "drizzle-orm";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { transactions, categories } from "@/server/db/schema";

async function getAuthUserId(): Promise<string> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session?.user?.id) {
		throw new Error("인증이 필요합니다.");
	}
	return session.user.id;
}

export interface MonthlyTrend {
	month: string; // "2026-01"
	income: number;
	expense: number;
}

export interface CategoryRanking {
	categoryId: string;
	categoryName: string;
	categoryIcon: string;
	amount: number;
	percentage: number;
	count: number;
}

/**
 * 최근 N개월 수입/지출 추이
 */
export async function getMonthlyTrend(months: number = 6): Promise<MonthlyTrend[]> {
	const userId = await getAuthUserId();

	const now = new Date();
	const startMonth = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
	const startDate = `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, "0")}-01`;

	const endYear = now.getFullYear();
	const endMonth = now.getMonth() + 2; // 다음 달 1일
	const nextMonth = endMonth > 12
		? `${endYear + 1}-01-01`
		: `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

	const rows = await db
		.select({
			month: sql<string>`to_char(${transactions.date}::date, 'YYYY-MM')`,
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
		.groupBy(sql`to_char(${transactions.date}::date, 'YYYY-MM')`, transactions.type)
		.orderBy(sql`to_char(${transactions.date}::date, 'YYYY-MM')`);

	// 모든 월을 채워서 반환 (데이터 없는 월도 0으로)
	const result: MonthlyTrend[] = [];
	for (let i = 0; i < months; i++) {
		const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
		result.push({ month: key, income: 0, expense: 0 });
	}

	for (const row of rows) {
		const entry = result.find((r) => r.month === row.month);
		if (entry) {
			if (row.type === "income") entry.income = Number(row.total);
			if (row.type === "expense") entry.expense = Number(row.total);
		}
	}

	return result;
}

/**
 * 카테고리별 지출 랭킹 (특정 월)
 */
export async function getCategoryRanking(month: string): Promise<CategoryRanking[]> {
	const userId = await getAuthUserId();

	const startDate = `${month}-01`;
	const [year, m] = month.split("-").map(Number);
	const nextMonth = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, "0")}-01`;

	const rows = await db
		.select({
			categoryId: transactions.categoryId,
			categoryName: categories.name,
			categoryIcon: categories.icon,
			amount: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
			count: sql<number>`count(*)`,
		})
		.from(transactions)
		.leftJoin(categories, eq(transactions.categoryId, categories.id))
		.where(
			and(
				eq(transactions.userId, userId),
				eq(transactions.type, "expense"),
				gte(transactions.date, startDate),
				lt(transactions.date, nextMonth),
			),
		)
		.groupBy(transactions.categoryId, categories.name, categories.icon)
		.orderBy(sql`sum(${transactions.amount}) desc`);

	const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);

	return rows.map((row) => ({
		categoryId: row.categoryId ?? "",
		categoryName: row.categoryName ?? "미분류",
		categoryIcon: row.categoryIcon ?? "📦",
		amount: Number(row.amount),
		percentage: total > 0 ? Math.round((Number(row.amount) / total) * 10000) / 100 : 0,
		count: Number(row.count),
	}));
}
