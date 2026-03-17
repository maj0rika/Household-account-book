// 파일 역할:
// - 운영/마이그레이션용 스크립트 파일이다.
// 사용 위치:
// - 개발자나 운영자가 터미널에서 직접 실행해 데이터/계정 상태를 정리할 때 사용된다;
// 흐름:
// - CLI 실행 -> 환경변수/DB 연결 확인 -> 대상 데이터 조회 -> 조건부 업데이트 또는 생성 -> 결과 로그 출력 순서로 흐른다;
import "dotenv/config";

import { eq } from "drizzle-orm";

import { db } from "../src/server/db";
import { accounts } from "../src/server/db/schema";
import { encrypt, isEncrypted, encryptNumber } from "../src/server/lib/crypto";

/**
 * accounts 테이블의 name/balance 필드를 암호화한다.
 * - 이미 암호화된 데이터(v1: 프리픽스)는 스킵 (멱등성)
 * - 한 건씩 UPDATE로 안전하게 처리
 */
async function main(): Promise<void> {
	process.stdout.write("계정 데이터 암호화 시작...\n");

	const rows = await db
		.select({
			id: accounts.id,
			name: accounts.name,
			balance: accounts.balance,
		})
		.from(accounts);

	let encrypted = 0;
	let skipped = 0;

	for (const row of rows) {
		const updates: Record<string, string> = {};

		if (!isEncrypted(row.name)) {
			updates.name = encrypt(row.name);
		}
		if (!isEncrypted(row.balance)) {
			updates.balance = encryptNumber(Number(row.balance));
		}

		if (Object.keys(updates).length === 0) {
			skipped++;
			continue;
		}

		await db
			.update(accounts)
			.set(updates)
			.where(eq(accounts.id, row.id));

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
