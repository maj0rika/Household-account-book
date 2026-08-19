import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, it } from "vitest";

import { LedgerOwnershipError, applyOwnedAccountBalance, requireOwnedAccount } from "../account-ledger";

describe("two-tenant ledger isolation", () => {
	it("does not mutate another user's account", async () => {
		const client = new PGlite();
		const db = drizzle(client);

		await client.exec(`
			CREATE TABLE accounts (
				id text PRIMARY KEY,
				user_id text NOT NULL,
				type text NOT NULL,
				balance text NOT NULL
			);
			INSERT INTO accounts (id, user_id, type, balance) VALUES
				('acct-a', 'user-a', 'asset', '10000'),
				('acct-b', 'user-b', 'asset', '20000');
		`);

		await expect(requireOwnedAccount(db, "user-a", "acct-b")).rejects.toBeInstanceOf(
			LedgerOwnershipError,
		);

		await expect(
			applyOwnedAccountBalance(db, {
				userId: "user-a",
				accountId: "acct-b",
				transactionType: "expense",
				amount: 1000,
			}),
		).rejects.toBeInstanceOf(LedgerOwnershipError);

		const leftover = await client.query<{ balance: string }>(
			"SELECT balance FROM accounts WHERE id = 'acct-b'",
		);
		expect(leftover.rows[0]?.balance).toBe("20000");
	});
});
