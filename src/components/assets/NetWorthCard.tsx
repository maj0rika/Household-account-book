"use client";

import { TrendingUp, TrendingDown, Landmark } from "lucide-react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { AccountSummary } from "@/types";

const cardVariants = {
	hidden: { opacity: 0, y: 12 },
	visible: (i: number) => ({
		opacity: 1,
		y: 0,
		transition: { delay: i * 0.08, duration: 0.35, ease: "easeOut" as const },
	}),
};

export function NetWorthCard({ summary }: { summary: AccountSummary }) {
	return (
		<div className="px-4 pt-4">
			<h2 className="mb-3 text-lg font-semibold">자산 현황</h2>
			<div className="grid grid-cols-3 gap-2">
				<motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
					<Card className="overflow-hidden gap-0 py-0">
						<CardContent className="mesh-gradient-income flex flex-col items-center gap-1 p-3">
							<TrendingUp className="h-4 w-4 text-income" />
							<span className="text-xs text-muted-foreground">총 자산</span>
							<span className="text-sm font-semibold text-income">
								{formatCurrency(summary.totalAssets)}
							</span>
						</CardContent>
					</Card>
				</motion.div>
				<motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
					<Card className="overflow-hidden gap-0 py-0">
						<CardContent className="mesh-gradient-expense flex flex-col items-center gap-1 p-3">
							<TrendingDown className="h-4 w-4 text-expense" />
							<span className="text-xs text-muted-foreground">총 부채</span>
							<span className="text-sm font-semibold text-expense">
								{formatCurrency(summary.totalDebts)}
							</span>
						</CardContent>
					</Card>
				</motion.div>
				<motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
					<Card className="overflow-hidden gap-0 py-0">
						<CardContent className="mesh-gradient-balance flex flex-col items-center gap-1 p-3">
							<Landmark className="h-4 w-4 text-primary" />
							<span className="text-xs text-muted-foreground">순자산</span>
							<span className={`text-sm font-semibold ${summary.netWorth >= 0 ? "text-income" : "text-expense"}`}>
								{formatCurrency(summary.netWorth)}
							</span>
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</div>
	);
}
