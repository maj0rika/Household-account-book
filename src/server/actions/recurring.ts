"use server";

// 파일 역할:
// - 고정 거래 규칙과 실제 월간 거래 생성 사이를 이어 주는 서버 액션 파일이다.
// 사용 위치:
// - `src/components/transaction/RecurringTransactionManager.tsx`가 규칙 조회/적용에 사용한다;
// - `src/components/transaction/RecurringTransactionManager.tsx`에서 이 파일을 import해 상위 흐름에 연결한다;
// 흐름:
// - 거래 페이지 또는 고정 거래 관리 시트 요청 -> recurring 규칙 조회 -> 대상 월의 실제 거래 시그니처와 비교 -> 아직 없는 거래만 생성 -> 관련 페이지 캐시 갱신 순서로 흐른다;
import { eq, and, gte, lt } from "drizzle-orm";

import { getAuthUserIdOrThrow } from "@/server/auth";
import { db } from "@/server/db";
import { recurringTransactions, transactions } from "@/server/db/schema";
import { requireOwnedCategory } from "@/server/lib/account-ledger";
import { encryptNullable } from "@/server/lib/crypto";
import { revalidateRecurringPages } from "@/lib/cache-keys";
import { createRecurringSchema, firstSchemaError, monthSchema } from "@/server/validation/write-schemas";

const getAuthUserId = getAuthUserIdOrThrow;

// `RecurringTransactionManager.tsx`가 리스트 렌더링 전에 호출한다.
// 이 함수는 "규칙 테이블"만 읽고, 실제 월간 거래 생성 여부는 다루지 않는다.
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
		const parsed = createRecurringSchema.safeParse(data);
		if (!parsed.success) {
			return { success: false, error: firstSchemaError(parsed.error) };
		}

		const userId = await getAuthUserId();

		if (parsed.data.categoryId) {
			await requireOwnedCategory(db, userId, parsed.data.categoryId);
		}

		await db.insert(recurringTransactions).values({
			userId,
			categoryId: parsed.data.categoryId,
			type: parsed.data.type,
			amount: parsed.data.amount,
			description: parsed.data.description,
			dayOfMonth: parsed.data.dayOfMonth,
		});

		revalidateRecurringPages();
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

		revalidateRecurringPages();
		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "삭제에 실패했습니다." };
	}
}

export async function applyRecurringTransactions(
	month: string,
): Promise<{ success: true; count: number; alreadyApplied: number } | { success: false; error: string }> {
	try {
		const parsedMonth = monthSchema.safeParse(month);
		if (!parsedMonth.success) {
			return { success: false, error: firstSchemaError(parsedMonth.error) };
		}

		const userId = await getAuthUserId();

		// 먼저 "이번 달에 적용할 수 있는 규칙" 전체를 읽어 실제 거래 후보를 만든다.
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

		// `existingRows`는 transactions 테이블에 이미 생성된 실제 고정 거래들이다.
		// 규칙 테이블과 실제 거래 테이블이 분리돼 있으므로 중복 방지를 위해 월 단위 재조회가 필요하다.
		const existingRows = await db
			.select({
				description: transactions.description,
				amount: transactions.amount,
				type: transactions.type,
				date: transactions.date,
			})
			.from(transactions)
			.where(
				and(
					eq(transactions.userId, userId),
					eq(transactions.isRecurring, true),
					gte(transactions.date, startDate),
					lt(transactions.date, nextMonth),
				),
			);

		const existingSet = new Set(
			existingRows.map((r) => `${r.type}|${r.description}|${r.amount}|${r.date}`),
		);

		const values = recurring
			.map((r) => {
				// 말일을 넘는 dayOfMonth는 해당 월의 마지막 날짜로 보정한다.
				const day = Math.min(r.dayOfMonth, daysInMonth);
				const date = `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
				return {
					userId,
					categoryId: r.categoryId,
					recurringRuleId: r.id,
					type: r.type,
					amount: r.amount,
					description: r.description,
					date,
					memo: encryptNullable("고정 거래 자동 생성"),
					isRecurring: true,
				};
			})
			// 시그니처 비교는 "같은 규칙이 이미 같은 날짜/금액/설명으로 생성됐는지"를 보는 핵심 중복 방지 로직이다.
			.filter((v) => !existingSet.has(`${v.type}|${v.description}|${v.amount}|${v.date}`));

		const alreadyApplied = recurring.length - values.length;

		if (values.length === 0) {
			return { success: true, count: 0, alreadyApplied };
		}

		await db.insert(transactions).values(values).onConflictDoNothing();

		revalidateRecurringPages();
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
				amount: transactions.amount,
				type: transactions.type,
				date: transactions.date,
			})
			.from(transactions)
			.where(
				and(
					eq(transactions.userId, userId),
					eq(transactions.isRecurring, true),
					gte(transactions.date, startDate),
					lt(transactions.date, nextMonth),
				),
			);

		const existingSet = new Set(
			existingRows.map((r) => `${r.type}|${r.description}|${r.amount}|${r.date}`),
		);

		const daysInMonth = new Date(year, m, 0).getDate();
		let applied = 0;
		for (const r of recurring) {
			// 규칙별로 "이번 달에 대응되는 실제 거래가 하나라도 있는지"를 계산한다.
			const day = Math.min(r.dayOfMonth, daysInMonth);
			const date = `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
			if (existingSet.has(`${r.type}|${r.description}|${r.amount}|${date}`)) {
				applied++;
			}
		}

		return { total: recurring.length, applied };
	} catch {
		return { total: 0, applied: 0 };
	}
}
