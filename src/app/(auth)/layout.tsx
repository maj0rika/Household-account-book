"use client";

// 파일 역할:
// - App Router 레이아웃 파일이다.
// 사용 위치:
// - App Router가 `/(auth)` 경로를 렌더링할 때 직접 사용한다;
// 흐름:
// - 라우트 진입점에서 필요한 데이터 조회와 화면 조합을 맡고, 세부 상호작용은 하위 컴포넌트로 위임한다;
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const [checked, setChecked] = useState(false);

	useEffect(() => {
		authClient.getSession()
			.then(({ data }) => {
				if (data?.session) {
					router.replace("/transactions");
					return;
				}

				setChecked(true);
			})
			.catch(() => {
				setChecked(true);
			});
	}, [router]);

	if (!checked) {
		return (
			<div className="flex min-h-dvh items-center justify-center">
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	return <>{children}</>;
}
