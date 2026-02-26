"use server";

import { headers } from "next/headers";
import { and, eq, gte, lt, sql, isNull } from "drizzle-orm";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { budgets, transactions, categories } from "@/server/db/schema";
import { revalidateBudgetPages } from "@/lib/cache-keys";

async function getAuthUserId(): Promise<string> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session?.user?.id) {
		throw new Error("인증이 필요합니다.");
	}
	return session.user.id;
}

export interface Budget {
	id: string;
	categoryId: string | null;
	categoryName: string | null;
	categoryIcon: string | null;
	amount: number;
	month: string;
}

export interface BudgetWithSpent extends Budget {
	spent: number;
	percentage: number; // 0~100+
}

/**
 * 특정 월의 예산 목록 조회 (지출 실적 포함)
 */
export async function getBudgetsWithSpent(month: string): Promise<BudgetWithSpent[]> {
	const userId = await getAuthUserId();

	const startDate = `${month}-01`;
	const [year, m] = month.split("-").map(Number);
	const nextMonth = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, "0")}-01`;

	// 예산 조회와 지출 합계를 병렬로 실행
	const [budgetRows, spentRows] = await Promise.all([
		db
			.select({
				id: budgets.id,
				categoryId: budgets.categoryId,
				amount: budgets.amount,
				month: budgets.month,
				categoryName: categories.name,
				categoryIcon: categories.icon,
			})
			.from(budgets)
			.leftJoin(categories, eq(budgets.categoryId, categories.id))
			.where(
				and(
					eq(budgets.userId, userId),
					eq(budgets.month, month),
				),
			),
		db
			.select({
				categoryId: transactions.categoryId,
				total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
			})
			.from(transactions)
			.where(
				and(
					eq(transactions.userId, userId),
					eq(transactions.type, "expense"),
					gte(transactions.date, startDate),
					lt(transactions.date, nextMonth),
				),
			)
			.groupBy(transactions.categoryId),
	]);

	if (budgetRows.length === 0) return [];

	const spentMap = new Map(spentRows.map((r) => [r.categoryId, Number(r.total)]));
	const totalSpent = spentRows.reduce((sum, r) => sum + Number(r.total), 0);

	return budgetRows.map((b) => {
		const spent = b.categoryId === null ? totalSpent : (spentMap.get(b.categoryId) ?? 0);
		return {
			id: b.id,
			categoryId: b.categoryId,
			categoryName: b.categoryId === null ? "전체" : (b.categoryName ?? "미분류"),
			categoryIcon: b.categoryId === null ? "💰" : (b.categoryIcon ?? "📦"),
			amount: b.amount,
			month: b.month,
			spent,
			percentage: b.amount > 0 ? Math.round((spent / b.amount) * 10000) / 100 : 0,
		};
	});
}

/**
 * 예산 설정 (upsert)
 */
export async function upsertBudget(data: {
	categoryId: string | null;
	amount: number;
	month: string;
}): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		// 기존 예산 확인
		const existing = await db
			.select({ id: budgets.id })
			.from(budgets)
			.where(
				and(
					eq(budgets.userId, userId),
					eq(budgets.month, data.month),
					data.categoryId
						? eq(budgets.categoryId, data.categoryId)
						: isNull(budgets.categoryId),
				),
			)
			.limit(1);

		if (existing.length > 0) {
			await db
				.update(budgets)
				.set({ amount: data.amount })
				.where(eq(budgets.id, existing[0].id));
		} else {
			await db.insert(budgets).values({
				userId,
				categoryId: data.categoryId,
				amount: data.amount,
				month: data.month,
			});
		}

		revalidateBudgetPages();
		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "예산 저장에 실패했습니다." };
	}
}

/**
 * 예산 삭제
 */
export async function deleteBudget(
	id: string,
): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		await db
			.delete(budgets)
			.where(and(eq(budgets.id, id), eq(budgets.userId, userId)));

		revalidateBudgetPages();
		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "예산 삭제에 실패했습니다." };
	}
}
