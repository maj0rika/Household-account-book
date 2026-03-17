// 파일 역할:
// - 클라이언트와 서버가 함께 쓰는 공용 유틸 파일이다.
// 사용 위치:
// - `src/app/(auth)/layout.tsx`에서 이 파일을 import해 상위 흐름에 연결한다;
// - `src/app/(auth)/login/page.tsx`에서 이 파일을 import해 상위 흐름에 연결한다;
// - `src/app/(auth)/register/page.tsx`에서 이 파일을 import해 상위 흐름에 연결한다;
// 흐름:
// - 여러 계층이 이 유틸을 공유하면서 같은 계산 규칙이나 포맷 규칙을 재사용한다;
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
	baseURL:
		process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
		(typeof window !== "undefined" ? window.location.origin : ""),
});
