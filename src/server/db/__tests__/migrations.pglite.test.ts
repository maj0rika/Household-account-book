import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, describe, expect, it } from "vitest";

interface MigrationJournal {
	entries: Array<{
		idx: number;
		tag: string;
	}>;
}

const EXPECTED_TABLES = [
	"account",
	"accounts",
	"budgets",
	"categories",
	"rateLimit",
	"recurring_transactions",
	"security_events",
	"security_rate_limits",
	"session",
	"transactions",
	"user",
	"verification",
] as const;

describe("drizzle migrations on PGlite", () => {
	const client = new PGlite();

	afterAll(async () => {
		await client.close();
	});

	it("applies all SQL migrations in journal order cleanly on a fresh database", async () => {
		const migrationsFolder = path.resolve(process.cwd(), "src/server/db/migrations");
		const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
		const journal = JSON.parse(readFileSync(journalPath, "utf8")) as MigrationJournal;

		expect(journal.entries.length).toBeGreaterThan(0);

		for (const entry of journal.entries) {
			const sqlPath = path.join(migrationsFolder, `${entry.tag}.sql`);
			const sql = readFileSync(sqlPath, "utf8");
			await client.exec(sql);
		}

		const result = await client.query<{ tablename: string }>(
			"SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
		);
		const tables = result.rows.map((row) => row.tablename);

		for (const tableName of EXPECTED_TABLES) {
			expect(tables).toContain(tableName);
		}

		const accountBalanceCol = await client.query<{ data_type: string }>(
			"SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'balance'",
		);
		expect(accountBalanceCol.rows[0]?.data_type).toBe("text");

		const txCols = await client.query<{ column_name: string }>(
			"SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions'",
		);
		const txColNames = txCols.rows.map((row) => row.column_name);
		expect(txColNames).toContain("transfer_account_id");
		expect(txColNames).toContain("recurring_rule_id");
	});
});
