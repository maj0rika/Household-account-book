import "dotenv/config";

import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";

import { Client } from "pg";

interface JournalEntry {
	idx: number;
	tag: string;
	when: number;
}

interface MigrationRecord {
	id: number;
	hash: string;
	createdAt: number;
}

interface RepairTarget {
	tag: string;
	isApplied: (client: Client) => Promise<boolean>;
}

const MIGRATION_DIR = path.resolve(process.cwd(), "src/server/db/migrations");
const JOURNAL_PATH = path.join(MIGRATION_DIR, "meta/_journal.json");
const TARGET_TAGS = new Set([
	"0002_serious_lady_vermin",
	"0003_gorgeous_shadowcat",
	"0004_superb_gladiator",
	"0005_add-accounts-table",
	"0006_add-performance-indexes",
	"0007_encrypt-account-fields",
	"0008_yellow_luckman",
]);

function readJournal(): JournalEntry[] {
	const raw = JSON.parse(readFileSync(JOURNAL_PATH, "utf8")) as { entries: JournalEntry[]; };
	return raw.entries;
}

function getMigrationHash(tag: string): string {
	const filePath = path.join(MIGRATION_DIR, `${tag}.sql`);
	const content = readFileSync(filePath);
	return createHash("sha256").update(content).digest("hex");
}

async function tableExists(client: Client, tableName: string): Promise<boolean> {
	const result = await client.query(
		`select 1 from information_schema.tables where table_schema = 'public' and table_name = $1 limit 1;`,
		[tableName],
	);

	return result.rows.length > 0;
}

async function columnExists(client: Client, tableName: string, columnName: string): Promise<boolean> {
	const result = await client.query(
		`select 1
		from information_schema.columns
		where table_schema = 'public' and table_name = $1 and column_name = $2
		limit 1;`,
		[tableName, columnName],
	);

	return result.rows.length > 0;
}

async function columnType(client: Client, tableName: string, columnName: string): Promise<string | null> {
	const result = await client.query(
		`select data_type
		from information_schema.columns
		where table_schema = 'public' and table_name = $1 and column_name = $2
		limit 1;`,
		[tableName, columnName],
	);

	return result.rows[0]?.data_type ?? null;
}

async function indexExists(client: Client, indexName: string): Promise<boolean> {
	const result = await client.query(
		`select 1 from pg_indexes where schemaname = 'public' and indexname = $1 limit 1;`,
		[indexName],
	);

	return result.rows.length > 0;
}

async function syncMigrationSequence(client: Client): Promise<void> {
	const sequenceResult = await client.query<{ sequenceName: string | null }>(
		`select pg_get_serial_sequence('drizzle.__drizzle_migrations', 'id') as "sequenceName";`,
	);
	const sequenceName = sequenceResult.rows[0]?.sequenceName;
	if (!sequenceName) return;

	await client.query(
		`select setval($1, coalesce((select max(id) from drizzle.__drizzle_migrations), 1), true);`,
		[sequenceName],
	);
}

const REPAIR_TARGETS: RepairTarget[] = [
	{
		tag: "0002_serious_lady_vermin",
		isApplied: async (client) => {
			const [userExists, usersExists, budgetsUserType, categoriesUserType, transactionsUserType] = await Promise.all([
				tableExists(client, "user"),
				tableExists(client, "users"),
				columnType(client, "budgets", "user_id"),
				columnType(client, "categories", "user_id"),
				columnType(client, "transactions", "user_id"),
			]);

			return userExists
				&& !usersExists
				&& budgetsUserType === "text"
				&& categoriesUserType === "text"
				&& transactionsUserType === "text";
		},
	},
	{
		tag: "0003_gorgeous_shadowcat",
		isApplied: async (client) => tableExists(client, "recurring_transactions"),
	},
	{
		tag: "0004_superb_gladiator",
		isApplied: async (client) => columnExists(client, "transactions", "is_recurring"),
	},
	{
		tag: "0005_add-accounts-table",
		isApplied: async (client) => {
			const [accountsTable, transactionAccountColumn] = await Promise.all([
				tableExists(client, "accounts"),
				columnExists(client, "transactions", "account_id"),
			]);

			return accountsTable && transactionAccountColumn;
		},
	},
	{
		tag: "0006_add-performance-indexes",
		isApplied: async (client) => {
			const [txUserDateIdx, txUserTypeDateIdx, txCategoryIdx, recurringActiveIdx] = await Promise.all([
				indexExists(client, "transactions_user_date_idx"),
				indexExists(client, "transactions_user_type_date_idx"),
				indexExists(client, "transactions_category_idx"),
				indexExists(client, "recurring_tx_user_active_idx"),
			]);

			return txUserDateIdx && txUserTypeDateIdx && txCategoryIdx && recurringActiveIdx;
		},
	},
	{
		tag: "0007_encrypt-account-fields",
		isApplied: async (client) => (await columnType(client, "accounts", "balance")) === "text",
	},
	{
		tag: "0008_yellow_luckman",
		isApplied: async (client) => {
			const [settlementTable, settlementMembersTable, settlementTransfersTable, accountImpactColumn] = await Promise.all([
				tableExists(client, "settlements"),
				tableExists(client, "settlement_members"),
				tableExists(client, "settlement_transfers"),
				columnExists(client, "transactions", "account_impact_amount"),
			]);

			return settlementTable && settlementMembersTable && settlementTransfersTable && accountImpactColumn;
		},
	},
];

async function main(): Promise<void> {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error("DATABASE_URL이 없습니다.");
	}

	const client = new Client({ connectionString });
	await client.connect();

	try {
		const migrationRows = await client.query<MigrationRecord>(
			`select id, hash, created_at as "createdAt" from drizzle.__drizzle_migrations order by id asc;`,
		);
		const appliedHashes = new Set(migrationRows.rows.map((row) => row.hash));
		const journalEntries = readJournal().filter((entry) => TARGET_TAGS.has(entry.tag));
		await syncMigrationSequence(client);

		const repairs: Array<{ hash: string; createdAt: number; tag: string }> = [];

		for (const entry of journalEntries) {
			const hash = getMigrationHash(entry.tag);
			if (appliedHashes.has(hash)) continue;

			const target = REPAIR_TARGETS.find((candidate) => candidate.tag === entry.tag);
			if (!target) continue;

			const schemaAlreadyApplied = await target.isApplied(client);
			if (!schemaAlreadyApplied) continue;

			repairs.push({
				hash,
				createdAt: entry.when,
				tag: entry.tag,
			});
		}

		if (repairs.length === 0) {
			console.log("[db:repair] no-op");
			return;
		}

		await client.query("begin;");

		for (const repair of repairs) {
			await client.query(
				`insert into drizzle.__drizzle_migrations (hash, created_at)
				values ($1, $2)
				on conflict do nothing;`,
				[repair.hash, String(repair.createdAt)],
			);
		}

		await syncMigrationSequence(client);
		await client.query("commit;");
		console.log("[db:repair] applied", repairs.map((repair) => repair.tag).join(", "));
	} catch (error) {
		await client.query("rollback;").catch(() => undefined);
		throw error;
	} finally {
		await client.end();
	}
}

main().catch((error) => {
	console.error("[db:repair] failed", error);
	process.exit(1);
});
