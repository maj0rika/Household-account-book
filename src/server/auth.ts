import { headers } from "next/headers";
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { categories } from "@/server/db/schema";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

export const auth = betterAuth({
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL,
	session: {
		expiresIn: 60 * 60 * 24 * 30, // 30일 (초 단위)
		updateAge: 60 * 60 * 24, // 1일마다 세션 갱신
	},
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: schema.authUsers,
			session: schema.authSessions,
			account: schema.authAccounts,
			verification: schema.authVerifications,
		},
	}),
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					// 가입 직후 기본 카테고리를 생성해 첫 거래 입력이 바로 가능하게 한다.
					// 별도 온보딩 단계로 미루면 파서와 저장 액션이 "카테고리 없음" 예외를 반복 처리해야 한다.
					await db.insert(categories).values(
						DEFAULT_CATEGORIES.map((cat, index) => ({
							userId: user.id,
							name: cat.name,
							icon: cat.icon,
							type: cat.type,
							sortOrder: index + 1,
							isDefault: true,
						})),
					).onConflictDoNothing();
				},
			},
		},
	},
});

const RECOVERABLE_SESSION_ERROR_MESSAGES = new Set([
	"Invalid token",
	"Session expired. Re-authenticate to perform this action.",
]);

function isRecoverableSessionError(error: unknown): error is APIError {
	if (!(error instanceof APIError)) {
		return false;
	}

	return RECOVERABLE_SESSION_ERROR_MESSAGES.has(error.body?.message ?? "");
}

export async function getServerSession() {
	try {
		return await auth.api.getSession({
			headers: await headers(),
		});
	} catch (error) {
		if (isRecoverableSessionError(error)) {
			return null;
		}

		throw error;
	}
}

export async function getRequestSession(requestHeaders: Headers) {
	try {
		return await auth.api.getSession({
			headers: requestHeaders,
		});
	} catch (error) {
		if (isRecoverableSessionError(error)) {
			return null;
		}

		throw error;
	}
}

export async function getAuthUserIdOrThrow(): Promise<string> {
	const session = await getServerSession();

	if (!session?.user?.id) {
		throw new Error("인증이 필요합니다.");
	}

	return session.user.id;
}
