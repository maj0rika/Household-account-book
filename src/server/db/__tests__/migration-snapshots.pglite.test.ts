import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import { getTableConfig, isPgEnum } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import * as schema from "../schema";

interface JournalEntry {
	idx: number;
	version: string;
	when: number;
	tag: string;
	breakpoints: boolean;
}

interface JournalFile {
	version: string;
	dialect: string;
	entries: JournalEntry[];
}

interface SnapshotFile {
	id: string;
	prevId: string;
	version: string;
	dialect: string;
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), "src/server/db/migrations");
const META_DIR = path.join(MIGRATIONS_DIR, "meta");

describe("Drizzle migrations and snapshots (0000-0009)", () => {
	it("journal entries match sql files, snapshot chain, and schema.ts with zero drift", async () => {
		const journal = JSON.parse(
			readFileSync(path.join(META_DIR, "_journal.json"), "utf8"),
		) as JournalFile;

		expect(journal.version).toBe("7");
		expect(journal.dialect).toBe("postgresql");
		expect(journal.entries).toHaveLength(10);

		let expectedPrevId = "00000000-0000-0000-0000-000000000000";
		let latestSnapshot: SnapshotFile | null = null;

		for (const [index, entry] of journal.entries.entries()) {
			expect(entry.idx).toBe(index);
			const sqlPath = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
			const prefix = String(entry.idx).padStart(4, "0");
			const snapshotPath = path.join(META_DIR, `${prefix}_snapshot.json`);

			expect(existsSync(sqlPath), `Missing SQL file: ${sqlPath}`).toBe(true);
			expect(existsSync(snapshotPath), `Missing snapshot file: ${snapshotPath}`).toBe(true);

			const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as SnapshotFile;
			expect(snapshot.version).toBe("7");
			expect(snapshot.dialect).toBe("postgresql");
			expect(snapshot.prevId).toBe(expectedPrevId);

			expectedPrevId = snapshot.id;
			latestSnapshot = snapshot;
		}

		expect(latestSnapshot).not.toBeNull();
		const currentSnapshot = await generateDrizzleJson(schema, latestSnapshot!.id);
		const pendingSql = await generateMigration(
			latestSnapshot as unknown as Parameters<typeof generateMigration>[0],
			currentSnapshot,
		);
		expect(pendingSql).toEqual([]);
	});

	it("applies 0000-0009 on fresh PGlite and matches schema.ts tables, columns, indexes, and enums", async () => {
		const client = new PGlite();
		try {
			const journal = JSON.parse(
				readFileSync(path.join(META_DIR, "_journal.json"), "utf8"),
			) as JournalFile;

			for (const entry of journal.entries) {
				const sqlContent = readFileSync(path.join(MIGRATIONS_DIR, `${entry.tag}.sql`), "utf8");
				const chunks = sqlContent.split("--> statement-breakpoint");
				for (const chunk of chunks) {
					const trimmed = chunk.trim();
					if (trimmed) {
						await client.exec(trimmed);
					}
				}
			}

			const tableRows = await client.query<{ table_name: string }>(
				`SELECT table_name
				 FROM information_schema.tables
				 WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
			);
			const dbTables = new Set(tableRows.rows.map((row) => row.table_name));

			const columnRows = await client.query<{
				table_name: string;
				column_name: string;
				is_nullable: string;
			}>(
				`SELECT table_name, column_name, is_nullable
				 FROM information_schema.columns
				 WHERE table_schema = 'public'`,
			);
			const dbColumnsByTable = new Map<string, Map<string, { notNull: boolean }>>();
			for (const row of columnRows.rows) {
				let cols = dbColumnsByTable.get(row.table_name);
				if (!cols) {
					cols = new Map();
					dbColumnsByTable.set(row.table_name, cols);
				}
				cols.set(row.column_name, { notNull: row.is_nullable === "NO" });
			}

			const indexRows = await client.query<{
				tablename: string;
				indexname: string;
				indexdef: string;
			}>(
				`SELECT tablename, indexname, indexdef
				 FROM pg_indexes
				 WHERE schemaname = 'public'`,
			);
			const dbIndexesByTable = new Map<string, Map<string, { isUnique: boolean }>>();
			for (const row of indexRows.rows) {
				let idxs = dbIndexesByTable.get(row.tablename);
				if (!idxs) {
					idxs = new Map();
					dbIndexesByTable.set(row.tablename, idxs);
				}
				idxs.set(row.indexname, {
					isUnique: row.indexdef.startsWith("CREATE UNIQUE INDEX"),
				});
			}

			const schemaTables = Object.values(schema).filter(
				(value): value is (typeof schema)[keyof typeof schema] =>
					typeof value === "object" &&
					value !== null &&
					Symbol.for("drizzle:IsDrizzleTable") in value,
			);

			expect(dbTables.size).toBe(schemaTables.length);

			for (const table of schemaTables) {
				const config = getTableConfig(table as Parameters<typeof getTableConfig>[0]);
				expect(dbTables.has(config.name), `Missing table ${config.name}`).toBe(true);

				const dbCols = dbColumnsByTable.get(config.name);
				expect(dbCols).toBeDefined();
				expect(dbCols!.size).toBe(config.columns.length);

				for (const col of config.columns) {
					const dbCol = dbCols!.get(col.name);
					expect(dbCol, `Missing column ${config.name}.${col.name}`).toBeDefined();
					expect(dbCol!.notNull).toBe(col.notNull);
				}

				const dbIdxs = dbIndexesByTable.get(config.name) ?? new Map();
				for (const idx of config.indexes) {
					const idxName = idx.config.name;
					expect(idxName).toBeDefined();
					const dbIdx = dbIdxs.get(idxName!);
					expect(dbIdx, `Missing index ${config.name}.${idxName}`).toBeDefined();
					expect(dbIdx!.isUnique).toBe(Boolean(idx.config.unique));
				}

				for (const uniqueConstraint of config.uniqueConstraints) {
					const constraintName = uniqueConstraint.name;
					expect(constraintName).toBeDefined();
					const dbIdx = dbIdxs.get(constraintName!);
					expect(dbIdx, `Missing unique constraint index ${config.name}.${constraintName}`).toBeDefined();
					expect(dbIdx!.isUnique).toBe(true);
				}
			}

			const enumRows = await client.query<{ typname: string; enumlabel: string }>(
				`SELECT t.typname, e.enumlabel
				 FROM pg_type t
				 JOIN pg_enum e ON t.oid = e.enumtypid
				 JOIN pg_namespace n ON n.oid = t.typnamespace
				 WHERE n.nspname = 'public'
				 ORDER BY t.typname, e.enumsortorder`,
			);
			const dbEnums = new Map<string, string[]>();
			for (const row of enumRows.rows) {
				const values = dbEnums.get(row.typname) ?? [];
				values.push(row.enumlabel);
				dbEnums.set(row.typname, values);
			}

			const schemaEnums = Object.values(schema).filter((value) => isPgEnum(value));
			expect(dbEnums.size).toBe(schemaEnums.length);
			for (const pgEnumItem of schemaEnums) {
				expect(dbEnums.get(pgEnumItem.enumName)).toEqual([...pgEnumItem.enumValues]);
			}
		} finally {
			await client.close();
		}
	});
});
