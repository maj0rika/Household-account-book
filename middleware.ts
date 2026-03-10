import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/transactions", "/categories", "/budget", "/statistics", "/settings", "/assets"];

const hasSessionCookie = (request: NextRequest): boolean => {
	return Boolean(
		request.cookies.get("better-auth.session_token") ||
			request.cookies.get("__Secure-better-auth.session_token"),
	);
};

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const isProtectedPath = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

	// middleware에서는 DB 조회 없이 쿠키 존재 여부만 보고 빠르게 분기한다.
	// 엄밀한 세션 검증은 각 서버 컴포넌트/액션에서 다시 수행하고, 여기서는 UX상 불필요한 라우트 접근만 먼저 막는다.
	const signedIn = hasSessionCookie(request);

	if (isProtectedPath && !signedIn) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/transactions/:path*", "/categories/:path*", "/budget/:path*", "/statistics/:path*", "/settings/:path*", "/assets/:path*", "/login", "/register"],
};
