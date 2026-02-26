"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface PostActionBannerProps {
	message?: string | null;
	targetId?: string;
}

// Suspense-aware 스크롤: 타겟 요소가 DOM에 나타날 때까지 기다림
function scrollToElementWhenReady(targetId: string, timeoutMs = 5000): () => void {
	const el = document.getElementById(targetId);
	if (el) {
		el.scrollIntoView({ behavior: "smooth", block: "start" });
		return () => {};
	}

	// MutationObserver로 Suspense resolve 대기
	let cancelled = false;
	const observer = new MutationObserver(() => {
		if (cancelled) return;
		const target = document.getElementById(targetId);
		if (target) {
			target.scrollIntoView({ behavior: "smooth", block: "start" });
			observer.disconnect();
		}
	});

	observer.observe(document.body, { childList: true, subtree: true });

	// 안전 타임아웃
	const timer = window.setTimeout(() => {
		cancelled = true;
		observer.disconnect();
	}, timeoutMs);

	return () => {
		cancelled = true;
		observer.disconnect();
		window.clearTimeout(timer);
	};
}

export function PostActionBanner({ message, targetId }: PostActionBannerProps) {
	const router = useRouter();
	const pathname = usePathname();
	const [visible, setVisible] = useState(Boolean(message));

	useEffect(() => {
		if (!message) {
			setVisible(false);
			return;
		}

		setVisible(true);

		// H1: URL 쿼리 파라미터 클리닝 — 새로고침 시 배너 재표시 방지
		const cleanTimer = window.setTimeout(() => {
			router.replace(pathname, { scroll: false });
		}, 100);

		// H2: Suspense-aware 스크롤
		let cleanupScroll = () => {};
		if (targetId) {
			const scrollDelay = window.setTimeout(() => {
				cleanupScroll = scrollToElementWhenReady(targetId);
			}, 200);
			const originalCleanupScroll = cleanupScroll;
			cleanupScroll = () => {
				window.clearTimeout(scrollDelay);
				originalCleanupScroll();
			};
		}

		const hideTimer = window.setTimeout(() => setVisible(false), 4500);

		return () => {
			window.clearTimeout(cleanTimer);
			window.clearTimeout(hideTimer);
			cleanupScroll();
		};
	}, [message, targetId, router, pathname]);

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
