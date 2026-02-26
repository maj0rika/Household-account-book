"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, PlusCircle, Landmark, Settings } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useManualInput } from "@/components/providers/ManualInputProvider";
import { useTabSwitchPerf } from "@/hooks/useTabSwitchPerf";

const TABS = [
	{ href: "/transactions", label: "홈", icon: Home },
	{ href: "/statistics", label: "분석", icon: BarChart3 },
	{ href: null, label: "입력", icon: PlusCircle, action: "manual-input" },
	{ href: "/assets", label: "자산", icon: Landmark },
	{ href: "/settings", label: "설정", icon: Settings },
] as const;

// 낙관적 탭 전환 안전 타임아웃 (네비게이션 실패 시 롤백)
const PENDING_TIMEOUT_MS = 3000;

export function BottomTabBar() {
	const pathname = usePathname();
	const { open: openManualInput } = useManualInput();
	const { startMeasure } = useTabSwitchPerf();

	// 낙관적 탭 전환: 클릭 즉시 하이라이트 변경
	const [pendingHref, setPendingHref] = useState<string | null>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// pathname 변경 시 낙관적 상태 초기화
	useEffect(() => {
		setPendingHref(null);
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, [pathname]);

	// 타임아웃 정리
	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, []);

	const handleTabClick = (href: string) => {
		if (href === pathname) return;

		// 성능 계측 시작
		startMeasure();

		// 낙관적 전환
		setPendingHref(href);

		// 안전 타임아웃 — 네비게이션 실패 시 롤백
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(() => {
			setPendingHref(null);
		}, PENDING_TIMEOUT_MS);
	};

	// 현재 활성 탭 결정: pendingHref > pathname
	const activeHref = pendingHref ?? pathname;

	return (
		<nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/80 backdrop-blur-xl md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
			<div className="mx-auto flex h-14 max-w-lg items-center justify-around">
				{TABS.map((tab) => {
					const Icon = tab.icon;

					// 액션 버튼 (입력)
					if (!tab.href) {
						return (
							<button
								key={tab.label}
								type="button"
								onClick={openManualInput}
								className="relative flex flex-1 flex-col items-center gap-0.5 py-1 text-xs text-muted-foreground transition-[color,transform] active:scale-95 active:duration-75"
							>
								<motion.span
									whileTap={{ scale: 0.85 }}
									transition={{ type: "spring", stiffness: 400, damping: 17 }}
								>
									<Icon className="h-5 w-5" />
								</motion.span>
								<span>{tab.label}</span>
							</button>
						);
					}

					// 일반 네비게이션 탭
					const isActive = activeHref === tab.href;
					return (
						<Link
							key={tab.label}
							href={tab.href}
							prefetch
							onClick={() => handleTabClick(tab.href)}
							className={cn(
								"relative flex flex-1 flex-col items-center gap-0.5 py-1 text-xs transition-[color,transform] active:scale-95 active:duration-75",
								isActive
									? "text-primary font-medium"
									: "text-muted-foreground",
							)}
						>
							{isActive && (
								<motion.span
									layoutId="tab-indicator"
									className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
									transition={{ type: "spring", stiffness: 500, damping: 30 }}
								/>
							)}
							<motion.span
								whileTap={{ scale: 0.85 }}
								transition={{ type: "spring", stiffness: 400, damping: 17 }}
							>
								<Icon className="h-5 w-5" />
							</motion.span>
							<span>{tab.label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
