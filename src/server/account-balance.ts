import { eq, sql } from "drizzle-orm";

import { accounts } from "@/server/db/schema";
import { decryptNumber, encryptNumber } from "@/server/lib/crypto";
import { db } from "@/server/db";

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function applyAccountDelta(
	tx: DbTransaction,
	accountId: string | null | undefined,
	delta: number,
): Promise<void> {
	if (!accountId || delta === 0) return;

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

export async function applyTransactionAccountImpact(
	tx: DbTransaction,
	accountId: string | null | undefined,
	type: "income" | "expense",
	amount: number,
): Promise<void> {
	const delta = type === "income" ? amount : -amount;
	await applyAccountDelta(tx, accountId, delta);
}

export async function reverseTransactionAccountImpact(
	tx: DbTransaction,
	accountId: string | null | undefined,
	type: "income" | "expense",
	amount: number,
): Promise<void> {
	const delta = type === "income" ? -amount : amount;
	await applyAccountDelta(tx, accountId, delta);
}
