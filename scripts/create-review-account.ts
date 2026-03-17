// 파일 역할:
// - 운영/마이그레이션용 스크립트 파일이다.
// 사용 위치:
// - 개발자나 운영자가 터미널에서 직접 실행해 데이터/계정 상태를 정리할 때 사용된다;
// 흐름:
// - CLI 실행 -> 환경변수/DB 연결 확인 -> 대상 데이터 조회 -> 조건부 업데이트 또는 생성 -> 결과 로그 출력 순서로 흐른다;
/**
 * Google Play 검토자용 테스트 계정 생성 스크립트
 *
 * 실행:
 * REVIEW_ACCOUNT_PASSWORD=... npx tsx scripts/create-review-account.ts
 */
import "dotenv/config";
import { Pool } from "pg";
import crypto from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { DEFAULT_CATEGORIES } from "../src/lib/constants";

const EMAIL = process.env.REVIEW_ACCOUNT_EMAIL ?? "googleplay-review@test.com";
const NAME = process.env.REVIEW_ACCOUNT_NAME ?? "Google Play Reviewer";

// 이 스크립트는 비밀번호가 없으면 아무것도 진행할 수 없다.
// 검토 계정 생성과 기존 계정 비밀번호 재설정 모두 같은 비밀번호를 기준으로 움직인다.
const getReviewPassword = () => {
	const password = process.env.REVIEW_ACCOUNT_PASSWORD;

	if (!password) {
		throw new Error("REVIEW_ACCOUNT_PASSWORD is required.");
	}

	return password;
};

async function main() {
	const password = getReviewPassword();
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	try {
		// 이미 존재하는지 확인
		const existing = await pool.query(
			"SELECT id, email FROM \"user\" WHERE email = $1",
			[EMAIL],
		);

		if (existing.rows.length > 0) {
			console.log("✅ 검토자 계정이 이미 존재합니다:", EMAIL);
			console.log("   ID:", existing.rows[0].id);

			// 이미 존재하는 계정이면 새로 만들지 않고 credential 비밀번호만 점검한다.
			const acct = await pool.query(
				"SELECT password FROM \"account\" WHERE user_id = $1 AND provider_id = 'credential'",
				[existing.rows[0].id],
			);
			if (acct.rows.length > 0) {
				const { verifyPassword } = await import("better-auth/crypto");
				const ok = await verifyPassword({ hash: acct.rows[0].password, password });
				console.log("   비밀번호 검증:", ok ? "✅ 일치" : "❌ 불일치 — 비밀번호 재설정 필요");

				if (!ok) {
					// 검토자 계정은 스토어 심사 때 바로 로그인돼야 하므로
					// 불일치가 나면 새 해시로 교체해 사람 개입 없이 복구한다.
					const newHash = await hashPassword(password);
					await pool.query(
						"UPDATE \"account\" SET password = $1 WHERE user_id = $2 AND provider_id = 'credential'",
						[newHash, existing.rows[0].id],
					);
					console.log("   비밀번호를 재설정했습니다.");
				}
			}
			return;
		}

		const hashedPassword = await hashPassword(password);
		const userId = crypto.randomUUID();
		const now = new Date();

		// Better Auth 스키마를 직접 채우는 스크립트라
		// user -> account -> categories 순서를 맞춰야 앱에서 바로 로그인과 입력이 가능하다.
		await pool.query(
			`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			[userId, NAME, EMAIL, false, now, now],
		);

		// account 테이블에 credential 삽입
		const accountId = crypto.randomUUID();
		await pool.query(
			`INSERT INTO "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			[accountId, userId, "credential", userId, hashedPassword, now, now],
		);

		// 기본 카테고리까지 같이 넣어야 로그인 직후 파서와 거래 저장이 그대로 동작한다.
		for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
			const cat = DEFAULT_CATEGORIES[i];
			await pool.query(
				`INSERT INTO categories (id, user_id, name, icon, type, sort_order, is_default)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)
				 ON CONFLICT DO NOTHING`,
				[crypto.randomUUID(), userId, cat.name, cat.icon, cat.type, i + 1, true],
			);
		}

		console.log("✅ 검토자 계정 생성 완료!");
		console.log("   이메일:", EMAIL);
		console.log("   이름:", NAME);
		console.log("   ID:", userId);
		console.log("   카테고리:", DEFAULT_CATEGORIES.length, "개 생성");
	} catch (error) {
		console.error("❌ 계정 생성 실패:", error);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

main();
