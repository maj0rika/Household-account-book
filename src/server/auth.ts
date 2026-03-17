// 파일 역할:
// - Better Auth 설정, 세션 최소화 훅, 서버 공통 인증 헬퍼를 모아 둔 파일이다.
// 사용 위치:
// - 서버 레이아웃, 루트 페이지, API Route, Server Action이 같은 세션 해석 규칙을 공유할 때 사용한다;
// - Better Auth route handler와 인증 보호가 필요한 서버 코드의 공통 허브다;
// 흐름:
// - 요청 단위 세션 조회를 `cache()`로 재사용하고, recoverable 세션 오류만 `null`로 흡수한 뒤 상위 계층에 세션 또는 사용자 ID를 넘긴다;
import { cache } from "react";
import { headers } from "next/headers";
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { categories } from "@/server/db/schema";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import {
	minimizeSessionIpAddress,
	minimizeSessionUserAgent,
} from "@/server/security";

const TRUSTED_ORIGINS = [
	process.env.BETTER_AUTH_URL,
	process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
].filter((value): value is string => Boolean(value));

export const auth = betterAuth({
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL,
	advanced: {
		ipAddress: {
			ipAddressHeaders: ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"],
			ipv6Subnet: 64,
		},
	},
	rateLimit: {
		enabled: true,
		storage: "database",
		window: 60,
		max: 60,
		customRules: {
			"/sign-in/email": {
				window: 10 * 60,
				max: 5,
			},
			"/sign-up/email": {
				window: 60 * 60,
				max: 5,
			},
		},
	},
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
			rateLimit: schema.authRateLimits,
		},
	}),
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins: TRUSTED_ORIGINS.length > 0 ? TRUSTED_ORIGINS : ["http://localhost:3000"],
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					// 가입 직후 기본 카테고리를 심어 두면
					// 첫 거래 입력, 파싱, 설정 화면이 모두 같은 기본 전제를 공유할 수 있다.
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
		session: {
			create: {
				before: async (session) => ({
					data: {
						// 세션에는 원본 IP/UA를 그대로 남기지 않고 비식별화 값만 저장한다.
						...session,
						ipAddress: minimizeSessionIpAddress(session.ipAddress as string | null | undefined),
						userAgent: minimizeSessionUserAgent(session.userAgent as string | null | undefined),
					},
				}),
			},
			update: {
				before: async (session) => ({
					data: {
						...session,
						ipAddress: minimizeSessionIpAddress(session.ipAddress as string | null | undefined),
						userAgent: minimizeSessionUserAgent(session.userAgent as string | null | undefined),
					},
				}),
			},
		},
	},
});

const RECOVERABLE_SESSION_ERROR_MESSAGES = new Set([
	"Invalid token",
	"Session expired. Re-authenticate to perform this action.",
]);

// 토큰 만료처럼 사용자가 다시 로그인하면 회복 가능한 오류만 null로 바꾼다.
// 그 외 오류는 실제 장애일 수 있으므로 그대로 던져야 한다.
function isRecoverableSessionError(error: unknown): error is APIError {
	if (!(error instanceof APIError)) {
		return false;
	}

	return RECOVERABLE_SESSION_ERROR_MESSAGES.has(error.body?.message ?? "");
}

const loadServerSession = cache(async () => {
	try {
		// 같은 요청 안에서는 동일 세션을 재사용해
		// 레이아웃/페이지/Server Action fan-out의 중복 조회를 줄인다.
		return await auth.api.getSession({
			headers: await headers(),
		});
	} catch (error) {
		if (isRecoverableSessionError(error)) {
			return null;
		}

		throw error;
	}
});

export async function getServerSession() {
	// 서버 컴포넌트와 서버 액션은 이 함수를 공통 진입점으로 사용한다.
	return loadServerSession();
}

export async function getRequestSession(requestHeaders: Headers) {
	try {
		// Route Handler는 `next/headers` 대신 이미 받은 요청 헤더를 사용해야 한다.
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

	// 대부분의 서버 액션은 사용자 ID만 있으면 되므로 이 헬퍼를 공통 진입점으로 쓴다.
	if (!session?.user?.id) {
		throw new Error("인증이 필요합니다.");
	}

	return session.user.id;
}
