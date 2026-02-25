"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, PlusCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
	{ href: "/transactions", label: "홈", icon: Home },
	{ href: "/statistics", label: "분석", icon: BarChart3 },
	{ href: "/transactions?manual=true", label: "입력", icon: PlusCircle },
	{ href: "/settings", label: "설정", icon: Settings },
] as const;

export function BottomTabBar() {
	const pathname = usePathname();

	return (
		<nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/80 backdrop-blur-lg md:hidden">
			<div className="mx-auto flex h-14 max-w-lg items-center justify-around">
				{TABS.map((tab) => {
					const isActive = pathname === tab.href || (tab.href === "/transactions" && pathname === "/transactions");
					const Icon = tab.icon;
					return (
						<Link
							key={tab.label}
							href={tab.href}
							className={cn(
								"flex flex-1 flex-col items-center gap-0.5 py-1 text-xs transition-colors",
								isActive
									? "text-primary font-medium"
									: "text-muted-foreground",
							)}
						>
							<Icon className="h-5 w-5" />
							<span>{tab.label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
