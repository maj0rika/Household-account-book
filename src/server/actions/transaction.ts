// 거래(수입/지출) CRUD 서버 액션
// - 거래+잔액 변경은 DB 트랜잭션으로 원자성 보장
// - FOR UPDATE 비관적 락으로 동시성 제어
// - 변경 후 revalidateTransactionPages로 캐시 무효화
"use server";

import { and, eq, gte, lt, lte, ilike, sql, desc, type SQL } from "drizzle-orm";

import { getAuthUserIdOrThrow } from "@/server/auth";
import { db } from "@/server/db";
import { transactions, categories, recurringTransactions, accounts } from "@/server/db/schema";
import type { ParsedTransaction } from "@/server/llm/types";
import { encryptNullable, decryptNullable, decryptString, encryptNumber, decryptNumber } from "@/server/lib/crypto";
import type { Transaction, MonthlySummary, CategoryBreakdown, DailyExpense, Category } from "@/types";
import { revalidateTransactionPages } from "@/lib/cache-keys";

// db.transaction 콜백의 tx 타입
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// 거래에 따른 계좌 잔액 반영 (FOR UPDATE 락으로 동시 수정 방지)
async function adjustAccountBalance(
	tx: DbTransaction,
	accountId: string | null | undefined,
	type: "income" | "expense",
	amount: number,
) {
	if (!accountId) return;
	const delta = type === "income" ? amount : -amount;
	const result = await tx.execute(
		sql`SELECT balance FROM accounts WHERE id = ${accountId} FOR UPDATE`,
	);
	const row = result.rows[0];
	if (!row) return;
	const current = decryptNumber(String(row.balance));
	await tx
		.update(accounts)
		.set({
			balance: encryptNumber(current + delta),
			updatedAt: new Date(),
		})
		.where(eq(accounts.id, accountId));
}

// 계좌 잔액 역산 (삭제/수정 시 이전 거래 되돌리기)
async function reverseAccountBalance(
	tx: DbTransaction,
	accountId: string | null | undefined,
	type: "income" | "expense",
	amount: number,
) {
	if (!accountId) return;
	const delta = type === "income" ? -amount : amount;
	const result = await tx.execute(
		sql`SELECT balance FROM accounts WHERE id = ${accountId} FOR UPDATE`,
	);
	const row = result.rows[0];
	if (!row) return;
	const current = decryptNumber(String(row.balance));
	await tx
		.update(accounts)
		.set({
			balance: encryptNumber(current + delta),
			updatedAt: new Date(),
		})
		.where(eq(accounts.id, accountId));
}

const getAuthUserId = getAuthUserIdOrThrow;

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
): Promise<{ success: true; count: number; message?: string } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();
		if (items.length === 0) {
			return { success: false, error: "저장할 거래가 없습니다." };
		}

		const normalizedItems = items.map((item) => {
			const normalizedCategory = normalizeCategoryName(item.category || defaultCategoryName(item.type));
			const finalCategory = normalizedCategory || defaultCategoryName(item.type);
			return {
				...item,
				category: finalCategory,
				description: item.description.trim() || finalCategory,
			};
		});

		// 1) 기존 카테고리 로드
		let userCategories = await db
			.select({ id: categories.id, name: categories.name, type: categories.type })
			.from(categories)
			.where(eq(categories.userId, userId));

		let categoryMap = new Map(userCategories.map((c) => [categoryKey(c.type, c.name), c.id]));

		// AI 추천 카테고리가 DB에 없으면 자동 생성하여 UX 끊김 방지
		const missingMap = new Map<string, { name: string; type: "income" | "expense" }>();
		for (const item of normalizedItems) {
			const key = categoryKey(item.type, item.category);
			if (!categoryMap.has(key)) {
				missingMap.set(key, { name: item.category, type: item.type });
			}
		}

		if (missingMap.size > 0) {
			// 누락된 카테고리 일괄 삽입
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

			// 최신화된 맵 재구축
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
				accountId: item.accountId ?? null,
				type: item.type,
				amount: item.amount,
				description: item.description,
				originalInput: encryptNullable(originalInput),
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

		// 트랜잭션 내부에서 중복 판정 + 삽입을 원자적으로 수행 (TOCTOU 방지)
		const savedCount = await db.transaction(async (tx) => {
			// 기존 고정거래 조회 (트랜잭션 내에서 일관된 스냅샷)
			const existingRecurring = await tx
				.select({
					type: recurringTransactions.type,
					amount: recurringTransactions.amount,
					description: recurringTransactions.description,
					categoryId: recurringTransactions.categoryId,
					dayOfMonth: recurringTransactions.dayOfMonth,
				})
				.from(recurringTransactions)
				.where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.isActive, true)));

			const existingSignatures: ExistingRecurringSignature[] = existingRecurring.map((row) => ({
				type: row.type,
				amount: Number(row.amount),
				description: row.description,
				categoryId: row.categoryId,
				dayOfMonth: row.dayOfMonth,
			}));

			const dedupedRecurring: typeof recurringCandidates = [];
			for (const candidate of recurringCandidates) {
				const signature: ExistingRecurringSignature = {
					type: candidate.type,
					amount: candidate.amount,
					description: candidate.description,
					categoryId: candidate.categoryId,
					dayOfMonth: candidate.dayOfMonth,
				};

				if (!isRecurringDuplicate(signature, existingSignatures)) {
					// 같은 요청 안에서도 중복 후보가 여러 번 들어올 수 있으므로
					// insert 전에 메모리 시그니처를 즉시 갱신해 중복 등록을 막는다.
					dedupedRecurring.push(candidate);
					existingSignatures.push(signature);
				}
			}

			if (regularValues.length > 0) {
				await tx.insert(transactions).values(regularValues);
				// 연결 계좌 잔액 반영
				for (const item of regularValues) {
					await adjustAccountBalance(tx, item.accountId, item.type, item.amount);
				}
			}

			if (dedupedRecurring.length > 0) {
				await tx.insert(recurringTransactions).values(
					dedupedRecurring.map((item) => ({
						userId: item.userId,
						categoryId: item.categoryId,
						type: item.type,
						amount: item.amount,
						description: item.description,
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
						description: item.description,
						originalInput: encryptNullable(originalInput),
						date: item.date,
						memo: encryptNullable("고정 거래 자동 생성"),
						isRecurring: true,
					})),
				);
				// 고정 거래는 "자동 생성된 이번 달 거래"와 "반복 규칙"을 함께 남겨야 한다.
				// 그래야 현재 월 집계에 즉시 반영되면서도 다음 달 자동 생성의 기준을 유지할 수 있다.
			}

			return regularValues.length + dedupedRecurring.length;
		});

		// 모든 항목이 중복으로 제거된 경우 사용자에게 원인 안내
		if (savedCount === 0) {
			const skippedRecurring = recurringCandidates.length - 0;
			if (skippedRecurring > 0) {
				return { success: true, count: 0, message: `고정 거래 ${skippedRecurring}건이 이미 등록되어 있어 건너뛰었습니다.` };
			}
		}

		revalidateTransactionPages();
		return { success: true, count: savedCount };
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
			accountId: transactions.accountId,
			type: transactions.type,
			amount: transactions.amount,
			description: transactions.description,
			date: transactions.date,
			memo: transactions.memo,
			isRecurring: transactions.isRecurring,
			createdAt: transactions.createdAt,
			updatedAt: transactions.updatedAt,
			categoryName: categories.name,
			categoryIcon: categories.icon,
			categoryType: categories.type,
			accountName: accounts.name,
			accountIcon: accounts.icon,
		})
		.from(transactions)
		.leftJoin(categories, eq(transactions.categoryId, categories.id))
		.leftJoin(accounts, eq(transactions.accountId, accounts.id))
		.where(and(...conditions))
		.orderBy(desc(transactions.date), desc(transactions.createdAt));

	return rows.map((row) => ({
		id: row.id,
		userId: row.userId,
		categoryId: row.categoryId,
		accountId: row.accountId,
		type: row.type,
		amount: row.amount,
		description: row.description,
		// 리스트 화면에서는 원문이 필요 없어서 null로 고정한다.
		// 암호화된 원문까지 복호화하면 건수에 비례해 crypto 비용이 커지고, 초기 렌더만 느려진다.
		originalInput: null,
		date: row.date,
		memo: decryptNullable(row.memo),
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
		account: row.accountName
			? {
					id: row.accountId!,
					name: decryptString(row.accountName),
					icon: row.accountIcon!,
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

		// 삭제 전 거래 정보 조회 (계좌 잔액 역산용)
		const [existing] = await db
			.select({
				accountId: transactions.accountId,
				type: transactions.type,
				amount: transactions.amount,
			})
			.from(transactions)
			.where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

		if (!existing) {
			return { success: false, error: "거래를 찾을 수 없습니다." };
		}

		await db.transaction(async (tx) => {
			await tx
				.delete(transactions)
				.where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

			// 연결 계좌 잔액 역산
			await reverseAccountBalance(tx, existing.accountId, existing.type, existing.amount);
		});

		revalidateTransactionPages();
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
		accountId?: string | null;
		description?: string;
		amount?: number;
		date?: string;
		memo?: string | null;
	},
): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		// 이전 거래 정보 조회 (계좌 잔액 조정용)
		const [existing] = await db
			.select({
				accountId: transactions.accountId,
				type: transactions.type,
				amount: transactions.amount,
			})
			.from(transactions)
			.where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

		if (!existing) {
			return { success: false, error: "거래를 찾을 수 없습니다." };
		}

		const newType = data.type ?? existing.type;
		const newAmount = data.amount ?? existing.amount;
		const newAccountId = data.accountId !== undefined ? data.accountId : existing.accountId;

		await db.transaction(async (tx) => {
			// 거래 업데이트
			await tx
				.update(transactions)
				.set({
					...(data.type !== undefined && { type: data.type }),
					...(data.categoryId !== undefined && { categoryId: data.categoryId }),
					...(data.accountId !== undefined && { accountId: data.accountId }),
					...(data.description !== undefined && { description: data.description }),
					...(data.amount !== undefined && { amount: data.amount }),
					...(data.date !== undefined && { date: data.date }),
					...(data.memo !== undefined && { memo: encryptNullable(data.memo) }),
					updatedAt: new Date(),
				})
				.where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

			// 이전 계좌 역산
			await reverseAccountBalance(tx, existing.accountId, existing.type, existing.amount);
			// 새 계좌 반영
			await adjustAccountBalance(tx, newAccountId, newType, newAmount);
		});

		revalidateTransactionPages();
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
	accountId?: string | null;
	description: string;
	amount: number;
	date: string;
	memo?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		await db.transaction(async (tx) => {
			await tx.insert(transactions).values({
				userId,
				categoryId: data.categoryId,
				accountId: data.accountId ?? null,
				type: data.type,
				amount: data.amount,
				description: data.description,
				date: data.date,
				memo: encryptNullable(data.memo ?? null),
			});

			// 연결 계좌 잔액 반영
			await adjustAccountBalance(tx, data.accountId, data.type, data.amount);
		});

		revalidateTransactionPages();
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
