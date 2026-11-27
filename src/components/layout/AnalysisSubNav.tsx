import Link from "next/link";
import { BarChart3, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

interface AnalysisSubNavProps {
	active: "statistics" | "budget";
	monthQuery?: string;
}

const ITEMS = [
	{ key: "statistics", href: "/statistics", label: "통계", icon: BarChart3 },
	{ key: "budget", href: "/budget", label: "예산", icon: Wallet },
] as const;

export function AnalysisSubNav({ active, monthQuery }: AnalysisSubNavProps) {
	const querySuffix = monthQuery ? `?month=${encodeURIComponent(monthQuery)}` : "";

	return (
		<nav aria-label="분석 하위 메뉴" className="px-4 pt-3">
			<div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/50 p-1">
				{ITEMS.map((item) => {
					const Icon = item.icon;
					const isActive = active === item.key;
					return (
						<Link
							key={item.key}
							href={`${item.href}${querySuffix}`}
							prefetch
							aria-current={isActive ? "page" : undefined}
							className={cn(
								"flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm transition-colors",
								isActive
									? "bg-background font-semibold text-foreground shadow-xs"
									: "font-medium text-muted-foreground hover:text-foreground",
							)}
						>
							<Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
							<span>{item.label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
