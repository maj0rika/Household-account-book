import "dotenv/config";

import { sql } from "drizzle-orm";

import { db } from "./index";

const reset = async (): Promise<void> => {
	await db.execute(sql`
		TRUNCATE TABLE
			"budgets",
			"recurring_transactions",
			"transactions",
			"categories",
			"verification",
			"account",
			"session",
			"user"
		RESTART IDENTITY CASCADE
	`);
};

reset()
	.then(() => {
		process.stdout.write("Reset completed\n");
		process.exit(0);
	})
	.catch((error: unknown) => {
		process.stderr.write(`Reset failed: ${String(error)}\n`);
		process.exit(1);
	});
