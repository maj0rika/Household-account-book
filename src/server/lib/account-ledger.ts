import { and, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { accounts, categories } from "@/server/db/schema";
import { decryptNumber, encryptNumber } from "@/server/lib/crypto";

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type AccountKind = "asset" | "debt";
export type TransactionKind = "income" | "expense";

export class LedgerOwnershipError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "LedgerOwnershipError";
	}
}

export function computeBalanceDelta(
	accountType: AccountKind,
	transactionType: TransactionKind,
	amount: number,
): number {
	if (!Number.isFinite(amount) || amount <= 0) {
		throw new Error(`잔액 변경 금액이 유효하지 않습니다: ${amount}`);
	}

	if (accountType === "asset") {
		return transactionType === "income" ? amount : -amount;
	}

	return transactionType === "expense" ? amount : -amount;
}

export async function requireOwnedAccount(
	tx: DbTransaction,
	userId: string,
	accountId: string,
): Promise<{ id: string; type: AccountKind; balance: string }> {
	const result = await tx.execute(
		sql`SELECT id, type, balance FROM accounts WHERE id = ${accountId} AND user_id = ${userId} FOR UPDATE`,
	);
	const row = result.rows[0] as { id: string; type: string; balance: string } | undefined;

	if (!row) {
		throw new LedgerOwnershipError("계좌를 찾을 수 없거나 권한이 없습니다.");
	}

	if (row.type !== "asset" && row.type !== "debt") {
		throw new Error(`계좌 유형이 유효하지 않습니다: ${row.type}`);
	}

	return {
		id: String(row.id),
		type: row.type,
		balance: String(row.balance),
	};
}

export async function requireOwnedCategory(
	client: Pick<DbTransaction, "select">,
	userId: string,
	categoryId: string,
): Promise<string> {
	const rows = await client
		.select({ id: categories.id })
		.from(categories)
		.where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
		.limit(1);

	if (rows.length === 0) {
		throw new LedgerOwnershipError("카테고리를 찾을 수 없거나 권한이 없습니다.");
	}

	return rows[0].id;
}

export async function applyOwnedAccountBalance(
	tx: DbTransaction,
	input: {
		userId: string;
		accountId: string | null | undefined;
		transactionType: TransactionKind;
		amount: number;
		reverse?: boolean;
	},
): Promise<void> {
	if (!input.accountId) return;

	const account = await requireOwnedAccount(tx, input.userId, input.accountId);
	const delta = computeBalanceDelta(account.type, input.transactionType, input.amount);
	const signed = input.reverse ? -delta : delta;
	const current = decryptNumber(account.balance);

	await tx
		.update(accounts)
		.set({
			balance: encryptNumber(current + signed),
			updatedAt: new Date(),
		})
		.where(and(eq(accounts.id, account.id), eq(accounts.userId, input.userId)));
}
