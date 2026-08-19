"use server";

import { eq } from "drizzle-orm";

import { getAuthUserIdOrThrow } from "@/server/auth";
import { db } from "@/server/db";
import { accounts, budgets, categories, recurringTransactions, transactions } from "@/server/db/schema";
import { decryptNumber, decryptString, decryptNullable } from "@/server/lib/crypto";

export interface UserDataExport {
	exportedAt: string;
	userId: string;
	categories: Array<{
		id: string;
		name: string;
		icon: string;
		type: "income" | "expense";
		sortOrder: number;
	}>;
	accounts: Array<{
		id: string;
		name: string;
		type: "asset" | "debt";
		subType: string;
		icon: string;
		balance: number;
		isActive: boolean;
	}>;
	transactions: Array<{
		id: string;
		type: "income" | "expense" | "transfer";
		amount: number;
		description: string;
		date: string;
		memo: string | null;
		categoryId: string | null;
		accountId: string | null;
		transferAccountId: string | null;
		recurringRuleId: string | null;
		isRecurring: boolean;
	}>;
	recurring: Array<{
		id: string;
		type: "income" | "expense" | "transfer";
		amount: number;
		description: string;
		dayOfMonth: number;
		isActive: boolean;
		categoryId: string | null;
	}>;
	budgets: Array<{
		id: string;
		categoryId: string | null;
		amount: number;
		month: string;
	}>;
}

export async function exportUserData(): Promise<
	{ success: true; data: UserDataExport } | { success: false; error: string }
> {
	try {
		const userId = await getAuthUserIdOrThrow();

		const [categoryRows, accountRows, transactionRows, recurringRows, budgetRows] = await Promise.all([
			db.select().from(categories).where(eq(categories.userId, userId)),
			db.select().from(accounts).where(eq(accounts.userId, userId)),
			db.select().from(transactions).where(eq(transactions.userId, userId)),
			db.select().from(recurringTransactions).where(eq(recurringTransactions.userId, userId)),
			db.select().from(budgets).where(eq(budgets.userId, userId)),
		]);

		return {
			success: true,
			data: {
				exportedAt: new Date().toISOString(),
				userId,
				categories: categoryRows.flatMap((row) => (
					row.type === "income" || row.type === "expense"
						? [{
							id: row.id,
							name: row.name,
							icon: row.icon,
							type: row.type,
							sortOrder: row.sortOrder,
						}]
						: []
				)),
				accounts: accountRows.map((row) => ({
					id: row.id,
					name: decryptString(row.name),
					type: row.type,
					subType: row.subType,
					icon: row.icon,
					balance: decryptNumber(row.balance),
					isActive: row.isActive,
				})),
				transactions: transactionRows.map((row) => ({
					id: row.id,
					type: row.type,
					amount: row.amount,
					description: row.description,
					date: row.date,
					memo: decryptNullable(row.memo),
					categoryId: row.categoryId,
					accountId: row.accountId,
					transferAccountId: row.transferAccountId,
					recurringRuleId: row.recurringRuleId,
					isRecurring: row.isRecurring,
				})),
				recurring: recurringRows.map((row) => ({
					id: row.id,
					type: row.type,
					amount: row.amount,
					description: row.description,
					dayOfMonth: row.dayOfMonth,
					isActive: row.isActive,
					categoryId: row.categoryId,
				})),
				budgets: budgetRows.map((row) => ({
					id: row.id,
					categoryId: row.categoryId,
					amount: row.amount,
					month: row.month,
				})),
			},
		};
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "내보내기에 실패했습니다." };
	}
}
