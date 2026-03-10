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

			// 비밀번호 검증
			const acct = await pool.query(
				"SELECT password FROM \"account\" WHERE user_id = $1 AND provider_id = 'credential'",
				[existing.rows[0].id],
			);
			if (acct.rows.length > 0) {
				const { verifyPassword } = await import("better-auth/crypto");
				const ok = await verifyPassword({ hash: acct.rows[0].password, password });
				console.log("   비밀번호 검증:", ok ? "✅ 일치" : "❌ 불일치 — 비밀번호 재설정 필요");

				if (!ok) {
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

		// user 테이블에 삽입
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

		// 기본 카테고리 생성 (databaseHooks와 동일)
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
