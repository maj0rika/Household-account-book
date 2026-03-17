// 파일 역할:
// - App Router 레이아웃 파일이다.
// 사용 위치:
// - App Router가 `/(auth)` 경로를 렌더링할 때 직접 사용한다;
// 흐름:
// - 인증 페이지 진입 시 서버에서 실제 세션을 확인하고, 이미 로그인된 사용자는 곧바로 대시보드로 보낸다;
import { redirect } from "next/navigation";

import { getServerSession } from "@/server/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
	const session = await getServerSession();

	if (session?.user) {
		redirect("/transactions");
	}

	return <>{children}</>;
}
