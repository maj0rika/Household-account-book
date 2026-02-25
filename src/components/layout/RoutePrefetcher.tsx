"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CORE_ROUTES = [
	"/transactions",
	"/statistics",
	"/assets",
	"/budget",
	"/settings",
] as const;

export function RoutePrefetcher() {
	const router = useRouter();

	useEffect(() => {
		const id = window.setTimeout(() => {
			for (const route of CORE_ROUTES) {
				router.prefetch(route);
			}
		}, 300);

		return () => window.clearTimeout(id);
	}, [router]);

	return null;
}
