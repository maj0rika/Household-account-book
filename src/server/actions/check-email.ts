"use server";

import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { authUsers } from "@/server/db/schema";

// 회원가입 전 이메일 중복 확인
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

	return { exists: true, provider: "credential" };
}
