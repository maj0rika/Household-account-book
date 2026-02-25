"use server";

import { headers } from "next/headers";
import { and, eq, gte, lt, lte, ilike, sql, desc, type SQL } from "drizzle-orm";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { transactions, categories, recurringTransactions } from "@/server/db/schema";
import {
	encryptString,
	encryptNumber,
	decryptString,
	decryptNumber,
} from "@/server/security/field-encryption";
import type { ParsedTransaction } from "@/server/llm/types";
import type { Transaction, MonthlySummary, CategoryBreakdown, DailyExpense, Category } from "@/types";

async function getAuthUserId(): Promise<string> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session?.user?.id) {
		throw new Error("인증이 필요합니다.");
	}
	return session.user.id;
}

function normalizeCategoryName(name: string): string {
	return name.trim().replace(/\s+/g, " ");
}

function categoryKey(type: "income" | "expense", name: string): string {
	return `${type}:${normalizeCategoryName(name)}`;
}

function defaultCategoryName(type: "income" | "expense"): string {
	return type === "income" ? "기타 수입" : "기타 지출";
}

function defaultCategoryIcon(type: "income" | "expense"): string {
	return type === "income" ? "💵" : "📦";
}

function normalizeDescription(value: string): string {
	return value.trim().replace(/\s+/g, " ").toLowerCase();
}

interface ExistingRecurringSignature {
	type: "income" | "expense";
	amount: number;
	description: string;
	categoryId: string | null;
	dayOfMonth: number;
}

function isRecurringDuplicate(
	candidate: ExistingRecurringSignature,
	existingList: ExistingRecurringSignature[],
): boolean {
	return existingList.some((row) => {
		if (row.type !== candidate.type) return false;
		if (row.amount !== candidate.amount) return false;
		if (normalizeDescription(row.description) !== normalizeDescription(candidate.description)) return false;
		if ((row.categoryId ?? null) !== (candidate.categoryId ?? null)) return false;
		return Math.abs(row.dayOfMonth - candidate.dayOfMonth) <= 1;
	});
}

export async function createTransactions(
	items: ParsedTransaction[],
	originalInput: string,
): Promise<{ success: true; count: number } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();
		if (items.length === 0) {
			return { success: false, error: "저장할 거래가 없습니다." };
		}

		const normalizedItems = items.map((item) => {
			const normalizedCategory = normalizeCategoryName(item.category || defaultCategoryName(item.type));
			return {
				...item,
				category: normalizedCategory || defaultCategoryName(item.type),
				description: item.description.trim() || item.category,
			};
		});

		// 1) 카테고리 조회
		let userCategories = await db
			.select({ id: categories.id, name: categories.name, type: categories.type })
			.from(categories)
			.where(eq(categories.userId, userId));

		let categoryMap = new Map(userCategories.map((c) => [categoryKey(c.type, c.name), c.id]));

		// 2) 누락 카테고리 자동 보정 (추천 추가 직후 동기화 지연 대응)
		const missingMap = new Map<string, { name: string; type: "income" | "expense" }>();
		for (const item of normalizedItems) {
			const key = categoryKey(item.type, item.category);
			if (!categoryMap.has(key)) {
				missingMap.set(key, { name: item.category, type: item.type });
			}
		}

		if (missingMap.size > 0) {
			await db
				.insert(categories)
				.values(
					Array.from(missingMap.values()).map((cat, index) => ({
						userId,
						name: cat.name,
						type: cat.type,
						icon: defaultCategoryIcon(cat.type),
						sortOrder: userCategories.length + index,
						isDefault: false,
					})),
				)
				.onConflictDoNothing({
					target: [categories.userId, categories.type, categories.name],
				});

			userCategories = await db
				.select({ id: categories.id, name: categories.name, type: categories.type })
				.from(categories)
				.where(eq(categories.userId, userId));
			categoryMap = new Map(userCategories.map((c) => [categoryKey(c.type, c.name), c.id]));
		}

		const regularValues = normalizedItems
			.filter((item) => !item.isRecurring)
			.map((item) => ({
				userId,
				categoryId: categoryMap.get(categoryKey(item.type, item.category)) ?? null,
				type: item.type,
				amount: item.amount,
				amountEnc: encryptNumber(item.amount),
				description: item.description,
				descriptionEnc: encryptString(item.description),
				originalInput,
				originalInputEnc: encryptString(originalInput),
				date: item.date,
				isRecurring: false,
			}));

		const recurringCandidates = normalizedItems
			.filter((item) => item.isRecurring)
			.map((item) => {
				const day = item.dayOfMonth ?? new Date(item.date).getDate();
				const dayOfMonth = Math.max(1, Math.min(31, day));
				return {
					userId,
					categoryId: categoryMap.get(categoryKey(item.type, item.category)) ?? null,
					type: item.type,
					amount: item.amount,
					description: item.description,
					dayOfMonth,
					isActive: true,
					date: item.date,
				};
			});

		// AI 자동 파싱 중복 방지: 기존 고정거래 + 현재 요청 내 중복 제거
		const existingRecurring = await db
			.select({
				type: recurringTransactions.type,
				amount: recurringTransactions.amount,
				amountEnc: recurringTransactions.amountEnc,
				description: recurringTransactions.description,
				descriptionEnc: recurringTransactions.descriptionEnc,
				categoryId: recurringTransactions.categoryId,
				dayOfMonth: recurringTransactions.dayOfMonth,
			})
			.from(recurringTransactions)
			.where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.isActive, true)));

		const dedupedRecurring: typeof recurringCandidates = [];
		const existingSignatures: ExistingRecurringSignature[] = existingRecurring.map((row) => ({
			type: row.type,
			amount: decryptNumber(row.amountEnc, row.amount),
			description: decryptString(row.descriptionEnc, row.description),
			categoryId: row.categoryId,
			dayOfMonth: row.dayOfMonth,
		}));

		for (const candidate of recurringCandidates) {
			const signature: ExistingRecurringSignature = {
				type: candidate.type,
				amount: candidate.amount,
				description: candidate.description,
				categoryId: candidate.categoryId,
				dayOfMonth: candidate.dayOfMonth,
			};

			if (isRecurringDuplicate(signature, existingSignatures)) {
				continue;
			}

			dedupedRecurring.push(candidate);
			existingSignatures.push(signature);
		}

		await db.transaction(async (tx) => {
			if (regularValues.length > 0) {
				await tx.insert(transactions).values(regularValues);
			}

			if (dedupedRecurring.length > 0) {
				await tx.insert(recurringTransactions).values(
					dedupedRecurring.map((item) => ({
						userId: item.userId,
						categoryId: item.categoryId,
						type: item.type,
						amount: item.amount,
						amountEnc: encryptNumber(item.amount),
						description: item.description,
						descriptionEnc: encryptString(item.description),
						dayOfMonth: item.dayOfMonth,
						isActive: true,
					})),
				);

				await tx.insert(transactions).values(
					dedupedRecurring.map((item) => ({
						userId: item.userId,
						categoryId: item.categoryId,
						type: item.type,
						amount: item.amount,
						amountEnc: encryptNumber(item.amount),
						description: item.description,
						descriptionEnc: encryptString(item.description),
						originalInput,
						originalInputEnc: encryptString(originalInput),
						date: item.date,
						memo: "고정 거래 자동 생성",
						memoEnc: encryptString("고정 거래 자동 생성"),
						isRecurring: true,
					})),
				);
			}
		});

		return { success: true, count: regularValues.length + dedupedRecurring.length };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "저장에 실패했습니다." };
	}
}

export interface TransactionFilters {
	type?: "income" | "expense";
	categoryId?: string;
	minAmount?: number;
	maxAmount?: number;
	query?: string;
}

export async function getTransactions(month: string, filters?: TransactionFilters): Promise<Transaction[]> {
	const userId = await getAuthUserId();

	const startDate = `${month}-01`;
	const [year, m] = month.split("-").map(Number);
	const nextMonth = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, "0")}-01`;

	const conditions: SQL[] = [
		eq(transactions.userId, userId),
		gte(transactions.date, startDate),
		lt(transactions.date, nextMonth),
	];

	if (filters?.type) {
		conditions.push(eq(transactions.type, filters.type));
	}
	if (filters?.categoryId) {
		conditions.push(eq(transactions.categoryId, filters.categoryId));
	}
	if (filters?.minAmount !== undefined) {
		conditions.push(gte(transactions.amount, filters.minAmount));
	}
	if (filters?.maxAmount !== undefined) {
		conditions.push(lte(transactions.amount, filters.maxAmount));
	}
	if (filters?.query) {
		conditions.push(ilike(transactions.description, `%${filters.query}%`));
	}

	const rows = await db
		.select({
			id: transactions.id,
			userId: transactions.userId,
			categoryId: transactions.categoryId,
			type: transactions.type,
			amount: transactions.amount,
			amountEnc: transactions.amountEnc,
			description: transactions.description,
			descriptionEnc: transactions.descriptionEnc,
			originalInput: transactions.originalInput,
			originalInputEnc: transactions.originalInputEnc,
			date: transactions.date,
			memo: transactions.memo,
			memoEnc: transactions.memoEnc,
			isRecurring: transactions.isRecurring,
			createdAt: transactions.createdAt,
			updatedAt: transactions.updatedAt,
			categoryName: categories.name,
			categoryIcon: categories.icon,
			categoryType: categories.type,
		})
		.from(transactions)
		.leftJoin(categories, eq(transactions.categoryId, categories.id))
		.where(and(...conditions))
		.orderBy(desc(transactions.date), desc(transactions.createdAt));

	const decryptedRows = rows.map((row) => ({
		id: row.id,
		userId: row.userId,
		categoryId: row.categoryId,
		type: row.type,
		amount: decryptNumber(row.amountEnc, row.amount),
		description: decryptString(row.descriptionEnc, row.description),
		originalInput: decryptString(row.originalInputEnc, row.originalInput),
		date: row.date,
		memo: row.memoEnc ? decryptString(row.memoEnc, row.memo) : row.memo,
		isRecurring: row.isRecurring,
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

	if (!filters?.query) {
		return decryptedRows;
	}

	const q = filters.query.toLowerCase();
	return decryptedRows.filter((row) => row.description.toLowerCase().includes(q));
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

export async function updateTransaction(
	id: string,
	data: {
		type?: "income" | "expense";
		categoryId?: string | null;
		description?: string;
		amount?: number;
		date?: string;
		memo?: string | null;
	},
): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		await db
			.update(transactions)
			.set({
				...(data.type !== undefined && { type: data.type }),
				...(data.categoryId !== undefined && { categoryId: data.categoryId }),
				...(data.description !== undefined && {
					description: data.description,
					descriptionEnc: encryptString(data.description),
				}),
				...(data.amount !== undefined && {
					amount: data.amount,
					amountEnc: encryptNumber(data.amount),
				}),
				...(data.date !== undefined && { date: data.date }),
				...(data.memo !== undefined && {
					memo: data.memo,
					memoEnc: encryptString(data.memo),
				}),
				updatedAt: new Date(),
			})
			.where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "수정에 실패했습니다." };
	}
}

export async function getUserCategories(): Promise<Category[]> {
	const userId = await getAuthUserId();

	const rows = await db
		.select()
		.from(categories)
		.where(eq(categories.userId, userId))
		.orderBy(categories.sortOrder);

	return rows.map((row) => ({
		id: row.id,
		userId: row.userId,
		name: row.name,
		icon: row.icon,
		type: row.type,
		sortOrder: row.sortOrder,
		isDefault: row.isDefault,
	}));
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
			amountEnc: encryptNumber(data.amount),
			description: data.description,
			descriptionEnc: encryptString(data.description),
			date: data.date,
			memo: data.memo ?? null,
			memoEnc: encryptString(data.memo ?? null),
		});

		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "저장에 실패했습니다." };
	}
}

export async function getCategoryBreakdown(month: string): Promise<CategoryBreakdown[]> {
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

	const totalExpense = rows.reduce((sum, row) => sum + Number(row.amount), 0);

	return rows.map((row) => ({
		categoryId: row.categoryId ?? "",
		categoryName: row.categoryName ?? "미분류",
		categoryIcon: row.categoryIcon ?? "📦",
		amount: Number(row.amount),
		percentage: totalExpense > 0 ? Math.round((Number(row.amount) / totalExpense) * 10000) / 100 : 0,
	}));
}

export async function getDailyExpenses(startDate: string, endDate: string): Promise<DailyExpense[]> {
	const userId = await getAuthUserId();

	const rows = await db
		.select({
			date: transactions.date,
			amount: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
		})
		.from(transactions)
		.where(
			and(
				eq(transactions.userId, userId),
				eq(transactions.type, "expense"),
				gte(transactions.date, startDate),
				lt(transactions.date, endDate),
			),
		)
		.groupBy(transactions.date)
		.orderBy(transactions.date);

	return rows.map((row) => ({
		date: row.date,
		amount: Number(row.amount),
	}));
}

export async function getMonthlyCalendarData(month: string): Promise<Record<string, { income: number; expense: number }>> {
	const userId = await getAuthUserId();

	const startDate = `${month}-01`;
	const [year, m] = month.split("-").map(Number);
	const nextMonth = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, "0")}-01`;

	const rows = await db
		.select({
			date: transactions.date,
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
		.groupBy(transactions.date, transactions.type);

	const result: Record<string, { income: number; expense: number }> = {};
	for (const row of rows) {
		if (!result[row.date]) {
			result[row.date] = { income: 0, expense: 0 };
		}
		result[row.date][row.type] = Number(row.total);
	}
	return result;
}
