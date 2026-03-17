// Better Auth 클라이언트 진입점이다.
// 로그인/회원가입 폼과 설정 화면의 로그아웃/계정 삭제 후 세션 정리에만 사용한다.
// 서버 레이아웃이나 서버 액션에서는 이 파일이 아니라 `src/server/auth.ts`를 사용한다.
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
	// 브라우저에서 현재 origin을 바로 알 수 있으면 그것을 쓰고,
	// 정적 환경이나 클라이언트 부팅 전에는 공개 auth URL을 우선 사용한다.
	baseURL:
		process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
		(typeof window !== "undefined" ? window.location.origin : ""),
});
