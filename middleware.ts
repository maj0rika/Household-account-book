import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/transactions", "/categories", "/budget", "/statistics", "/settings"];
const AUTH_PAGES = ["/login", "/register"];

const hasSessionCookie = (request: NextRequest): boolean => {
	return Boolean(
		request.cookies.get("better-auth.session_token") ||
			request.cookies.get("__Secure-better-auth.session_token"),
	);
};

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const isProtectedPath = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
	const isAuthPage = AUTH_PAGES.includes(pathname);
	const signedIn = hasSessionCookie(request);

	if (isProtectedPath && !signedIn) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	if (isAuthPage && signedIn) {
		return NextResponse.redirect(new URL("/transactions", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/transactions/:path*", "/categories/:path*", "/budget/:path*", "/statistics/:path*", "/settings/:path*", "/login", "/register"],
};
