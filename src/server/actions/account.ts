"use server";

import { headers } from "next/headers";
import { and, eq, desc, sql } from "drizzle-orm";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { accounts } from "@/server/db/schema";
import type { Account, AccountSummary } from "@/types";

async function getAuthUserId(): Promise<string> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session?.user?.id) {
		throw new Error("인증이 필요합니다.");
	}
	return session.user.id;
}

export async function getAccounts(): Promise<Account[]> {
	const userId = await getAuthUserId();

	const rows = await db
		.select()
		.from(accounts)
		.where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)))
		.orderBy(accounts.type, accounts.sortOrder, desc(accounts.createdAt));

	return rows.map((row) => ({
		id: row.id,
		userId: row.userId,
		name: row.name,
		type: row.type,
		subType: row.subType,
		icon: row.icon,
		balance: row.balance,
		sortOrder: row.sortOrder,
		isActive: row.isActive,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	}));
}

export async function getAccountSummary(): Promise<AccountSummary> {
	const userId = await getAuthUserId();

	const result = await db
		.select({
			type: accounts.type,
			total: sql<number>`coalesce(sum(${accounts.balance}), 0)`,
		})
		.from(accounts)
		.where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)))
		.groupBy(accounts.type);

	let totalAssets = 0;
	let totalDebts = 0;
	for (const row of result) {
		if (row.type === "asset") totalAssets = Number(row.total);
		if (row.type === "debt") totalDebts = Number(row.total);
	}

	return {
		totalAssets,
		totalDebts,
		netWorth: totalAssets - totalDebts,
	};
}

export async function createAccount(data: {
	name: string;
	type: "asset" | "debt";
	subType: string;
	icon: string;
	balance: number;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		const [row] = await db
			.insert(accounts)
			.values({
				userId,
				name: data.name,
				type: data.type,
				subType: data.subType,
				icon: data.icon,
				balance: data.balance,
			})
			.returning({ id: accounts.id });

		return { success: true, id: row.id };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "계정 생성에 실패했습니다." };
	}
}

export async function updateAccount(
	id: string,
	data: {
		name?: string;
		icon?: string;
		balance?: number;
		subType?: string;
		sortOrder?: number;
	},
): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		await db
			.update(accounts)
			.set({
				...(data.name !== undefined && { name: data.name }),
				...(data.icon !== undefined && { icon: data.icon }),
				...(data.balance !== undefined && { balance: data.balance }),
				...(data.subType !== undefined && { subType: data.subType }),
				...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
				updatedAt: new Date(),
			})
			.where(and(eq(accounts.id, id), eq(accounts.userId, userId)));

		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "계정 수정에 실패했습니다." };
	}
}

export interface AccountBatchItem {
	action: "create" | "update";
	accountId?: string;
	name: string;
	type: "asset" | "debt";
	subType: string;
	icon: string;
	balance: number;
}

export async function upsertParsedAccountsBatch(
	items: AccountBatchItem[],
): Promise<{ success: true; count: number } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		await db.transaction(async (tx) => {
			for (const item of items) {
				if (item.action === "update") {
					if (!item.accountId) {
						throw new Error("업데이트 대상 계정 ID가 없습니다.");
					}

					const result = await tx
						.update(accounts)
						.set({
							name: item.name,
							subType: item.subType,
							icon: item.icon,
							balance: item.balance,
							updatedAt: new Date(),
						})
						.where(and(eq(accounts.id, item.accountId), eq(accounts.userId, userId)));

					if (result.rowCount === 0) {
						throw new Error("수정할 계정을 찾을 수 없습니다.");
					}
				} else {
					await tx.insert(accounts).values({
						userId,
						name: item.name,
						type: item.type,
						subType: item.subType,
						icon: item.icon,
						balance: item.balance,
					});
				}
			}
		});

		return { success: true, count: items.length };
	} catch (e) {
		return {
			success: false,
			error: e instanceof Error ? e.message : "자산/부채 저장에 실패했습니다.",
		};
	}
}

export async function deleteAccount(
	id: string,
): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		// 소프트 삭제 (isActive = false)
		await db
			.update(accounts)
			.set({ isActive: false, updatedAt: new Date() })
			.where(and(eq(accounts.id, id), eq(accounts.userId, userId)));

		return { success: true };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : "계정 삭제에 실패했습니다." };
	}
}
