"use client";

import { useEffect, useState } from "react";

interface PostActionBannerProps {
	message?: string | null;
	targetId?: string;
}

export function PostActionBanner({ message, targetId }: PostActionBannerProps) {
	const [visible, setVisible] = useState(Boolean(message));

	useEffect(() => {
		if (!message) {
			setVisible(false);
			return;
		}

		setVisible(true);

		const scrollTimer = window.setTimeout(() => {
			if (!targetId) return;
			const el = document.getElementById(targetId);
			if (el) {
				el.scrollIntoView({ behavior: "smooth", block: "start" });
			}
		}, 120);

		const hideTimer = window.setTimeout(() => setVisible(false), 4500);
		return () => {
			window.clearTimeout(scrollTimer);
			window.clearTimeout(hideTimer);
		};
	}, [message, targetId]);

	if (!message || !visible) return null;

	return (
		<div className="mx-4 mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
			{message}
		</div>
	);
}
