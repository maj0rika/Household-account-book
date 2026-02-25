"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Home, BarChart3, Settings, Wallet, PlusCircle, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
	{ href: "/transactions", label: "거래 내역", icon: Home },
	{ href: "/statistics", label: "통계", icon: BarChart3 },
	{ href: "/transactions?manual=true", label: "직접 입력", icon: PlusCircle },
	{ href: "/budget", label: "예산", icon: Wallet },
	{ href: "/settings", label: "설정", icon: Settings },
];

const STORAGE_KEY = "sidebar-collapsed";

export function Sidebar() {
	const pathname = usePathname();
	const [collapsed, setCollapsed] = useState(false);

	useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved === "true") {
			setCollapsed(true);
		}
	}, []);

	const toggleCollapsed = () => {
		setCollapsed((prev) => {
			const next = !prev;
			localStorage.setItem(STORAGE_KEY, String(next));
			return next;
		});
	};

	return (
		<aside
			className={cn(
				"hidden md:flex md:flex-col md:border-r md:border-border transition-[width] duration-200",
				collapsed ? "md:w-14" : "md:w-56",
			)}
		>
			{/* 헤더 + 토글 */}
			<div className={cn(
				"flex h-14 items-center border-b border-border",
				collapsed ? "justify-center px-2" : "justify-between px-4",
			)}>
				{collapsed ? (
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={toggleCollapsed}
						className="text-muted-foreground hover:text-foreground"
						title="사이드바 펼치기"
					>
						<PanelLeftOpen className="h-4 w-4" />
					</Button>
				) : (
					<>
						<div className="flex items-center gap-2">
							<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
								<Wallet className="h-4 w-4 text-primary" />
							</div>
							<motion.span
								initial={{ opacity: 0, x: -8 }}
								animate={{ opacity: 1, x: 0 }}
								className="text-base font-semibold"
							>
								가계부
							</motion.span>
						</div>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={toggleCollapsed}
							className="text-muted-foreground hover:text-foreground"
							title="사이드바 접기"
						>
							<PanelLeftClose className="h-4 w-4" />
						</Button>
					</>
				)}
			</div>

			{/* 네비게이션 */}
			<nav className="flex flex-1 flex-col gap-1 p-2">
				{NAV_ITEMS.map((item) => {
					const hrefPath = item.href.split("?")[0];
					const hasQuery = item.href.includes("?");
					// 쿼리파라미터가 있는 항목은 active 표시하지 않음 (클릭 전용)
					const isActive = !hasQuery && pathname.startsWith(hrefPath);
					const Icon = item.icon;
					return (
						<Link
							key={item.href}
							href={item.href}
							title={collapsed ? item.label : undefined}
							className={cn(
								"relative flex items-center rounded-lg transition-colors",
								collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
								isActive
									? "text-accent-foreground font-medium"
									: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
							)}
						>
							{isActive && (
								<motion.span
									layoutId="sidebar-indicator"
									className="absolute inset-0 rounded-lg bg-accent"
									transition={{ type: "spring", stiffness: 500, damping: 30 }}
								/>
							)}
							<Icon className="relative z-10 h-4 w-4 shrink-0" />
							{!collapsed && <span className="relative z-10 text-sm">{item.label}</span>}
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}
