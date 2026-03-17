// 파일 역할:
// - DB 연결, 스키마, 운영 스크립트를 담당하는 파일이다.
// 사용 위치:
// - 직접 import 경로가 드러나지 않는 진입점이거나, 프레임워크/테스트 러너가 런타임에 호출한다;
// 흐름:
// - 서버 액션과 인증 계층이 이 파일을 통해 스키마/연결/운영 스크립트에 접근한다;
import "dotenv/config";

import { sql } from "drizzle-orm";

import { db } from "./index";

const reset = async (): Promise<void> => {
	await db.execute(sql`
		TRUNCATE TABLE
			"security_events",
			"security_rate_limits",
			"rateLimit",
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
