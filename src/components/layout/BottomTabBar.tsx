"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, PlusCircle, Settings } from "lucide-react";
import { motion } from "motion/react";
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
		<nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/80 backdrop-blur-xl md:hidden">
			<div className="mx-auto flex h-14 max-w-lg items-center justify-around">
				{TABS.map((tab) => {
					const isActive = pathname === tab.href || (tab.href === "/transactions" && pathname === "/transactions");
					const Icon = tab.icon;
					return (
						<Link
							key={tab.label}
							href={tab.href}
							className={cn(
								"relative flex flex-1 flex-col items-center gap-0.5 py-1 text-xs transition-colors active:scale-95",
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
