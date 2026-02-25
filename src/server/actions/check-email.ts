"use server";

import { eq, and } from "drizzle-orm";

import { db } from "@/server/db";
import { authUsers, authAccounts } from "@/server/db/schema";

/**
 * 회원가입 전 이메일 중복 + provider 확인
 * Google 계정으로 이미 가입된 이메일이면 안내 메시지 반환
 */
export async function checkEmailProvider(
	email: string,
): Promise<{ exists: false } | { exists: true; provider: string }> {
	const user = await db
		.select({ id: authUsers.id })
		.from(authUsers)
		.where(eq(authUsers.email, email.toLowerCase().trim()))
		.limit(1);

	if (user.length === 0) {
		return { exists: false };
	}

	// 소셜 provider 확인 (google 등)
	const socialAccount = await db
		.select({ providerId: authAccounts.providerId })
		.from(authAccounts)
		.where(
			and(
				eq(authAccounts.userId, user[0].id),
				eq(authAccounts.providerId, "google"),
			),
		)
		.limit(1);

	if (socialAccount.length > 0) {
		return { exists: true, provider: "google" };
	}

	// 이메일/비밀번호 계정만 있는 경우
	return { exists: true, provider: "credential" };
}
