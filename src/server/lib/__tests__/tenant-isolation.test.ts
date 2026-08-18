import { describe, expect, it } from "vitest";

import { LedgerOwnershipError, requireOwnedAccount } from "../account-ledger";

describe("tenant ownership contract", () => {
	it("rejects another user's account id", async () => {
		const ownerId = "user-a";
		const foreignId = "acct-b";
		const tx = {
			execute: async () => ({ rows: [] }),
		};

		await expect(requireOwnedAccount(tx, ownerId, foreignId)).rejects.toBeInstanceOf(
			LedgerOwnershipError,
		);
	});

	it("accepts a locked row only when user_id matches", async () => {
		const tx = {
			execute: async () => ({
				rows: [{ id: "acct-a", type: "asset", balance: "0" }],
			}),
		};

		await expect(requireOwnedAccount(tx, "user-a", "acct-a")).resolves.toMatchObject({
			id: "acct-a",
			type: "asset",
		});
	});
});
