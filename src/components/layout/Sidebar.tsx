"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Home, BarChart3, Settings, Wallet, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
	{ href: "/transactions", label: "거래 내역", icon: Home },
	{ href: "/statistics", label: "통계", icon: BarChart3 },
	{ href: "/budget", label: "예산", icon: Wallet },
	{ href: "/settings", label: "설정", icon: Settings },
];

const STORAGE_KEY = "sidebar-collapsed";

export function Sidebar() {
	const pathname = usePathname();
	const [collapsed, setCollapsed] = useState(false);

	// localStorage에서 상태 복원
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
			{/* 헤더 */}
			<div className={cn(
				"flex h-14 items-center border-b border-border",
				collapsed ? "justify-center px-2" : "gap-2 px-4",
			)}>
				<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
					<Wallet className="h-4 w-4 text-primary" />
				</div>
				{!collapsed && <span className="text-base font-semibold">가계부</span>}
			</div>

			{/* 네비게이션 */}
			<nav className="flex flex-1 flex-col gap-1 p-2">
				{NAV_ITEMS.map((item) => {
					const isActive = pathname.startsWith(item.href);
					const Icon = item.icon;
					return (
						<Link
							key={item.href}
							href={item.href}
							title={collapsed ? item.label : undefined}
							className={cn(
								"flex items-center rounded-lg transition-colors",
								collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
								isActive
									? "bg-accent text-accent-foreground font-medium"
									: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
							)}
						>
							<Icon className="h-4 w-4 shrink-0" />
							{!collapsed && <span className="text-sm">{item.label}</span>}
						</Link>
					);
				})}
			</nav>

			{/* 토글 버튼 */}
			<div className={cn("border-t border-border p-2", collapsed && "flex justify-center")}>
				<Button
					variant="ghost"
					size={collapsed ? "icon" : "sm"}
					onClick={toggleCollapsed}
					className={cn(!collapsed && "w-full justify-start gap-2")}
				>
					{collapsed ? (
						<PanelLeftOpen className="h-4 w-4" />
					) : (
						<>
							<PanelLeftClose className="h-4 w-4" />
							<span className="text-xs">접기</span>
						</>
					)}
				</Button>
			</div>
		</aside>
	);
}
