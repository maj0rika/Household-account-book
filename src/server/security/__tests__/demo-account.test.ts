import { describe, expect, it } from "vitest";

import { isDemoAccountEmail, isDemoBlockedAuthPath } from "../demo-account";

describe("isDemoAccountEmail", () => {
	it("대소문자와 앞뒤 공백이 달라도 체험 계정으로 본다", () => {
		expect(isDemoAccountEmail(" Demo@Example.com ")).toBe(true);
	});

	it("다른 계정과 빈 값은 체험 계정이 아니다", () => {
		expect(isDemoAccountEmail("portfolio-demo@example.com")).toBe(false);
		expect(isDemoAccountEmail(null)).toBe(false);
		expect(isDemoAccountEmail(undefined)).toBe(false);
	});
});

describe("isDemoBlockedAuthPath", () => {
	it("비밀번호 변경, 계정 삭제, 세션 강제 종료 경로를 막는다", () => {
		for (const path of ["/change-password", "/delete-user", "/update-user", "/revoke-sessions"]) {
			expect(isDemoBlockedAuthPath(path)).toBe(true);
		}
	});

	it("로그인, 로그아웃, 세션 조회는 막지 않는다", () => {
		for (const path of ["/sign-in/email", "/sign-out", "/get-session"]) {
			expect(isDemoBlockedAuthPath(path)).toBe(false);
		}
	});
});
