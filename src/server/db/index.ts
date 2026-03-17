// 파일 역할:
// - DB 연결, 스키마, 운영 스크립트를 담당하는 파일이다.
// 사용 위치:
// - `scripts/encrypt-existing-data.ts`에서 이 파일을 import해 상위 흐름에 연결한다;
// - `scripts/migrate-encrypt-accounts.ts`에서 이 파일을 import해 상위 흐름에 연결한다;
// - `src/server/actions/account.ts`에서 이 파일을 import해 상위 흐름에 연결한다;
// 흐름:
// - 서버 액션과 인증 계층이 이 파일을 통해 스키마/연결/운영 스크립트에 접근한다;
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
	connectionString: databaseUrl,
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 5000,
});

export const db = drizzle({ client: pool, schema });
