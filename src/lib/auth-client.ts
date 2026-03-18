// Better Auth 클라이언트 진입점이다.
// 로그인/회원가입 폼과 설정 화면의 로그아웃/계정 삭제 후 세션 정리에만 사용한다.
// 서버 레이아웃이나 서버 액션에서는 이 파일이 아니라 `src/server/auth.ts`를 사용한다.
import { createAuthClient } from "better-auth/client";

const getAuthBaseURL = (): string => {
	if (typeof window !== "undefined") {
		return window.location.origin;
	}

	return process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000";
};

export const authClient = createAuthClient({
	// 브라우저에서는 현재 origin을 우선 사용해 개발/프리뷰 포트와 auth origin 불일치를 막는다.
	// 서버 렌더 단계에서는 공개 auth URL을 fallback으로 둔다.
	baseURL: getAuthBaseURL(),
});
