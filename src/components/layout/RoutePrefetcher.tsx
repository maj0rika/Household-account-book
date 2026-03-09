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
