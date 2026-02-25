"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, PlusCircle, Settings, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
	{ href: "/transactions", label: "거래 내역", icon: Home },
	{ href: "/statistics", label: "통계", icon: BarChart3 },
	{ href: "/budget", label: "예산", icon: Wallet },
	{ href: "/settings", label: "설정", icon: Settings },
];

export function Sidebar() {
	const pathname = usePathname();

	return (
		<aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-border">
			<div className="flex h-14 items-center gap-2 border-b border-border px-4">
				<PlusCircle className="h-5 w-5 text-primary" />
				<span className="text-base font-semibold">가계부</span>
			</div>
			<nav className="flex flex-1 flex-col gap-1 p-2">
				{NAV_ITEMS.map((item) => {
					const isActive = pathname.startsWith(item.href);
					const Icon = item.icon;
					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
								isActive
									? "bg-accent text-accent-foreground font-medium"
									: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
							)}
						>
							<Icon className="h-4 w-4" />
							{item.label}
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}
