// 파일 역할:
// - 포트폴리오에 공개한 체험 계정이 계정 자체를 바꾸거나 지우지 못하게 막는 기준을 둔다.
// 사용 위치:
// - `src/server/auth.ts`의 Better Auth before 훅과 `src/server/actions/settings.ts`의 계정 삭제 액션이 사용한다;
export const DEMO_ACCOUNT_EMAIL = "demo@example.com";

export const DEMO_ACCOUNT_BLOCKED_MESSAGE = "체험 계정은 계정 정보를 바꾸거나 삭제할 수 없습니다.";

// 공개 계정이 잠기거나 사라지면 포트폴리오 링크와 DB keep-alive 워크플로가 함께 끊긴다.
const DEMO_BLOCKED_AUTH_PATHS = new Set([
	"/change-password",
	"/set-password",
	"/change-email",
	"/update-user",
	"/delete-user",
	"/revoke-session",
	"/revoke-sessions",
	"/revoke-other-sessions",
]);

export function isDemoAccountEmail(email: string | null | undefined): boolean {
	return email?.trim().toLowerCase() === DEMO_ACCOUNT_EMAIL;
}

export function isDemoBlockedAuthPath(path: string): boolean {
	return DEMO_BLOCKED_AUTH_PATHS.has(path);
}
