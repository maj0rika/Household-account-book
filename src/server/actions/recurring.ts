"use server";

import { headers } from "next/headers";
import { eq, and, gte, lt } from "drizzle-orm";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { recurringTransactions, transactions } from "@/server/db/schema";
import {
	encryptString,
	encryptNumber,
	decryptString,
	decryptNumber,
} from "@/server/security/field-encryption";

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

	const rows = await db
		.select()
		.from(recurringTransactions)
		.where(eq(recurringTransactions.userId, userId))
		.orderBy(recurringTransactions.dayOfMonth);

	return rows.map((row) => ({
		...row,
		description: decryptString(row.descriptionEnc, row.description),
		amount: decryptNumber(row.amountEnc, row.amount),
	}));
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
			amountEnc: encryptNumber(data.amount),
			description: data.description,
			descriptionEnc: encryptString(data.description),
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
): Promise<{ success: true; count: number; alreadyApplied: number } | { success: false; error: string }> {
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
			return { success: true, count: 0, alreadyApplied: 0 };
		}

		const [year, m] = month.split("-").map(Number);
		const daysInMonth = new Date(year, m, 0).getDate();
		const monthStr = `${year}-${String(m).padStart(2, "0")}`;
		const startDate = `${monthStr}-01`;
		const nextMonth = m === 12
			? `${year + 1}-01-01`
			: `${year}-${String(m + 1).padStart(2, "0")}-01`;

		// 이미 적용된 거래 조회
		const existingRows = await db
			.select({
				description: transactions.description,
				descriptionEnc: transactions.descriptionEnc,
				amount: transactions.amount,
				amountEnc: transactions.amountEnc,
				type: transactions.type,
				date: transactions.date,
			})
			.from(transactions)
			.where(
				and(
					eq(transactions.userId, userId),
					eq(transactions.memo, "고정 거래 자동 생성"),
					gte(transactions.date, startDate),
					lt(transactions.date, nextMonth),
				),
			);

		const existingSet = new Set(
			existingRows.map((r) => {
				const description = decryptString(r.descriptionEnc, r.description);
				const amount = decryptNumber(r.amountEnc, r.amount);
				return `${r.type}|${description}|${amount}|${r.date}`;
			}),
		);

		const values = recurring
			.map((r) => {
				const day = Math.min(r.dayOfMonth, daysInMonth);
				const date = `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
				const amount = decryptNumber(r.amountEnc, r.amount);
				const description = decryptString(r.descriptionEnc, r.description);
				return {
					userId,
					categoryId: r.categoryId,
					type: r.type,
					amount,
					amountEnc: encryptNumber(amount),
					description,
					descriptionEnc: encryptString(description),
					date,
					memo: "고정 거래 자동 생성",
					memoEnc: encryptString("고정 거래 자동 생성"),
					isRecurring: true,
				};
			})
			.filter((v) => !existingSet.has(`${v.type}|${v.description}|${v.amount}|${v.date}`));

		const alreadyApplied = recurring.length - values.length;

		if (values.length === 0) {
			return { success: true, count: 0, alreadyApplied };
		}

		await db.insert(transactions).values(values);

		return { success: true, count: values.length, alreadyApplied };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "적용에 실패했습니다." };
	}
}

/** 해당 월에 고정 거래가 모두 적용되었는지 확인한다. */
export async function checkRecurringApplied(
	month: string,
): Promise<{ total: number; applied: number }> {
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
			return { total: 0, applied: 0 };
		}

		const [year, m] = month.split("-").map(Number);
		const monthStr = `${year}-${String(m).padStart(2, "0")}`;
		const startDate = `${monthStr}-01`;
		const nextMonth = m === 12
			? `${year + 1}-01-01`
			: `${year}-${String(m + 1).padStart(2, "0")}-01`;

		const existingRows = await db
			.select({
				description: transactions.description,
				descriptionEnc: transactions.descriptionEnc,
				amount: transactions.amount,
				amountEnc: transactions.amountEnc,
				type: transactions.type,
				date: transactions.date,
			})
			.from(transactions)
			.where(
				and(
					eq(transactions.userId, userId),
					eq(transactions.memo, "고정 거래 자동 생성"),
					gte(transactions.date, startDate),
					lt(transactions.date, nextMonth),
				),
			);

		const existingSet = new Set(
			existingRows.map((r) => {
				const description = decryptString(r.descriptionEnc, r.description);
				const amount = decryptNumber(r.amountEnc, r.amount);
				return `${r.type}|${description}|${amount}|${r.date}`;
			}),
		);

		const daysInMonth = new Date(year, m, 0).getDate();
		let applied = 0;
		for (const r of recurring) {
			const day = Math.min(r.dayOfMonth, daysInMonth);
			const date = `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
			const description = decryptString(r.descriptionEnc, r.description);
			const amount = decryptNumber(r.amountEnc, r.amount);
			if (existingSet.has(`${r.type}|${description}|${amount}|${date}`)) {
				applied++;
			}
		}

		return { total: recurring.length, applied };
	} catch {
		return { total: 0, applied: 0 };
	}
}

/**
 * 오늘 날짜 기준으로 적용되어야 할 고정 거래를 자동 생성한다.
 * - dayOfMonth <= 오늘 날짜인 고정 거래 중
 * - 이번 달에 아직 동일 거래가 없는 건만 insert
 * - 페이지 로드 시 호출 (서버 컴포넌트)
 */
export async function autoApplyRecurringTransactions(): Promise<number> {
	try {
		const userId = await getAuthUserId();

		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth() + 1;
		const today = now.getDate();
		const daysInMonth = new Date(year, month, 0).getDate();

		const monthStr = `${year}-${String(month).padStart(2, "0")}`;
		const startDate = `${monthStr}-01`;
		const nextMonth = month === 12
			? `${year + 1}-01-01`
			: `${year}-${String(month + 1).padStart(2, "0")}-01`;

		// 활성화된 고정 거래 중 오늘 이전 날짜인 것
		const recurring = await db
			.select()
			.from(recurringTransactions)
			.where(
				and(
					eq(recurringTransactions.userId, userId),
					eq(recurringTransactions.isActive, true),
				),
			);

		const dueItems = recurring.filter((r) => Math.min(r.dayOfMonth, daysInMonth) <= today);
		if (dueItems.length === 0) return 0;

		// 이번 달 "고정 거래 자동 생성" 메모가 달린 기존 거래 조회
		const existingRows = await db
			.select({
				description: transactions.description,
				descriptionEnc: transactions.descriptionEnc,
				amount: transactions.amount,
				amountEnc: transactions.amountEnc,
				type: transactions.type,
				date: transactions.date,
			})
			.from(transactions)
			.where(
				and(
					eq(transactions.userId, userId),
					eq(transactions.memo, "고정 거래 자동 생성"),
					gte(transactions.date, startDate),
					lt(transactions.date, nextMonth),
				),
			);

		const existingSet = new Set(
			existingRows.map((r) => {
				const description = decryptString(r.descriptionEnc, r.description);
				const amount = decryptNumber(r.amountEnc, r.amount);
				return `${r.type}|${description}|${amount}|${r.date}`;
			}),
		);

		// 아직 적용 안 된 건만 필터
		const newValues = dueItems
			.map((r) => {
				const day = Math.min(r.dayOfMonth, daysInMonth);
				const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
				const amount = decryptNumber(r.amountEnc, r.amount);
				const description = decryptString(r.descriptionEnc, r.description);
				return {
					userId,
					categoryId: r.categoryId,
					type: r.type,
					amount,
					amountEnc: encryptNumber(amount),
					description,
					descriptionEnc: encryptString(description),
					date,
					memo: "고정 거래 자동 생성",
					memoEnc: encryptString("고정 거래 자동 생성"),
					isRecurring: true,
				};
			})
			.filter((v) => !existingSet.has(`${v.type}|${v.description}|${v.amount}|${v.date}`));

		if (newValues.length === 0) return 0;

		await db.insert(transactions).values(newValues);

		return newValues.length;
	} catch {
		// 자동 적용 실패는 조용히 무시 (사용자 경험 방해 안 함)
		return 0;
	}
}
