import "dotenv/config";

import { eq, isNull, not, or } from "drizzle-orm";

import { db } from "../src/server/db";
import { transactions } from "../src/server/db/schema";
import { encrypt, isEncrypted } from "../src/server/lib/crypto";

/**
 * 기존 transactions 테이블의 originalInput/memo 필드를 암호화한다.
 * - 이미 암호화된 데이터(v1: 프리픽스)는 스킵 (멱등성)
 * - 한 건씩 UPDATE로 안전하게 처리
 */
async function main(): Promise<void> {
	process.stdout.write("기존 데이터 암호화 시작...\n");

	const rows = await db
		.select({
			id: transactions.id,
			originalInput: transactions.originalInput,
			memo: transactions.memo,
		})
		.from(transactions)
		.where(
			or(
				not(isNull(transactions.originalInput)),
				not(isNull(transactions.memo)),
			),
		);

	let encrypted = 0;
	let skipped = 0;

	for (const row of rows) {
		const updates: Record<string, string> = {};

		if (row.originalInput && !isEncrypted(row.originalInput)) {
			updates.originalInput = encrypt(row.originalInput);
		}
		if (row.memo && !isEncrypted(row.memo)) {
			updates.memo = encrypt(row.memo);
		}

		if (Object.keys(updates).length === 0) {
			skipped++;
			continue;
		}

		await db
			.update(transactions)
			.set(updates)
			.where(eq(transactions.id, row.id));

		encrypted++;
	}

	process.stdout.write(`완료: ${encrypted}건 암호화, ${skipped}건 스킵 (이미 암호화됨)\n`);
}

main()
	.then(() => process.exit(0))
	.catch((e: unknown) => {
		process.stderr.write(`마이그레이션 실패: ${String(e)}\n`);
		process.exit(1);
	});
