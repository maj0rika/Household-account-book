"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const CORE_ROUTES = [
	"/transactions",
	"/statistics",
	"/assets",
	"/budget",
	"/settings",
] as const;

export function RoutePrefetcher() {
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		// 첫 페인트 직후 핵심 탭만 미리 데워서 모바일 탭 전환 지연을 줄인다.
		// 현재 경로는 제외해 불필요한 중복 prefetch를 막는다.
		const id = window.setTimeout(() => {
			for (const route of CORE_ROUTES) {
				if (route === pathname) continue;
				router.prefetch(route);
			}
		}, 300);

		return () => window.clearTimeout(id);
	}, [pathname, router]);

	return null;
}
