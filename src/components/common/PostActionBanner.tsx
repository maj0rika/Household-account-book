"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface PostActionBannerProps {
	message?: string | null;
}

export function PostActionBanner({ message }: PostActionBannerProps) {
	const router = useRouter();
	const pathname = usePathname();
	const [visible, setVisible] = useState(Boolean(message));

	useEffect(() => {
		if (!message) {
			setVisible(false);
			return;
		}

		setVisible(true);

		// URL 쿼리 파라미터 클리닝 — 새로고침 시 배너 재표시 방지
		const cleanTimer = window.setTimeout(() => {
			router.replace(pathname, { scroll: false });
		}, 100);

		const hideTimer = window.setTimeout(() => setVisible(false), 4500);

		return () => {
			window.clearTimeout(cleanTimer);
			window.clearTimeout(hideTimer);
		};
	}, [message, router, pathname]);

	if (!message || !visible) return null;

	return (
		<div
			role="alert"
			aria-live="polite"
			className="mx-4 mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground"
		>
			{message}
		</div>
	);
}
