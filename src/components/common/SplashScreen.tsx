"use client";

import { useEffect, useState } from "react";

// Capacitor SplashScreen 동적 import (웹에서는 무시)
const hideNativeSplash = async () => {
	try {
		const { SplashScreen } = await import("@capacitor/splash-screen");
		await SplashScreen.hide({ fadeOutDuration: 200 });
	} catch {
		// 웹 환경 — Capacitor 미설치 시 무시
	}
};

// 스플래시 표시 시간 (ms)
const SPLASH_DURATION = 1000;
// 페이드아웃 전환 시간 (ms)
const FADEOUT_DURATION = 400;

export function AppSplashScreen() {
	const [phase, setPhase] = useState<"active" | "fadeout" | "done">("active");

	useEffect(() => {
		// 네이티브 스플래시 숨기기 (커스텀 스플래시가 대체)
		hideNativeSplash();

		// 스플래시 표시 → 페이드아웃 시작
		const showTimer = setTimeout(() => {
			setPhase("fadeout");
		}, SPLASH_DURATION);

		return () => clearTimeout(showTimer);
	}, []);

	useEffect(() => {
		if (phase !== "fadeout") return;

		// 페이드아웃 애니메이션 완료 후 DOM에서 제거
		const removeTimer = setTimeout(() => {
			setPhase("done");
		}, FADEOUT_DURATION);

		return () => clearTimeout(removeTimer);
	}, [phase]);

	if (phase === "done") return null;

	return (
		<div
			className="splash-overlay"
			aria-hidden="true"
			data-phase={phase}
		>
			<div className="splash-logo">
				{/* 앱 로고 — ₩ 심볼 + AI 악센트 */}
				<svg
					width="80"
					height="80"
					viewBox="0 0 512 512"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className="splash-icon"
				>
					<rect width="512" height="512" rx="112" fill="url(#splash-bg)" />
					<text
						x="256"
						y="300"
						fontFamily="-apple-system,system-ui,sans-serif"
						fontSize="260"
						fontWeight="700"
						fill="white"
						textAnchor="middle"
						dominantBaseline="central"
					>
						₩
					</text>
					<circle cx="390" cy="130" r="45" fill="rgba(255,255,255,0.25)" />
					<path
						d="M390 100 L390 160 M360 130 L420 130"
						stroke="white"
						strokeWidth="8"
						strokeLinecap="round"
					/>
					<circle cx="390" cy="130" r="8" fill="white" />
					<defs>
						<linearGradient id="splash-bg" x1="0%" y1="0%" x2="100%" y2="100%">
							<stop offset="0%" stopColor="#34c571" />
							<stop offset="100%" stopColor="#2da562" />
						</linearGradient>
					</defs>
				</svg>
				<span className="splash-title">가계부</span>
			</div>
		</div>
	);
}
