"use client";

import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { MonthlySummary } from "@/types";

const cardVariants = {
	hidden: { opacity: 0, y: 12 },
	visible: (i: number) => ({
		opacity: 1,
		y: 0,
		transition: { delay: i * 0.08, duration: 0.35, ease: "easeOut" as const },
	}),
};

export function MonthlySummaryCard({ summary, month }: { summary: MonthlySummary; month: string }) {
	const [, m] = month.split("-").map(Number);

	return (
		<div className="px-4 pt-4">
			<h2 className="mb-3 text-lg font-semibold">{m}월 요약</h2>
			<div className="grid grid-cols-3 gap-2">
				<motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
					<Card className="overflow-hidden gap-0 py-0">
						<CardContent className="mesh-gradient-income flex flex-col items-center gap-1 p-3">
							<TrendingUp className="h-4 w-4 text-income" />
							<span className="text-xs text-muted-foreground">수입</span>
							<span className="text-sm font-semibold text-income">
								{formatCurrency(summary.income)}
							</span>
						</CardContent>
					</Card>
				</motion.div>
				<motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
					<Card className="overflow-hidden gap-0 py-0">
						<CardContent className="mesh-gradient-expense flex flex-col items-center gap-1 p-3">
							<TrendingDown className="h-4 w-4 text-expense" />
							<span className="text-xs text-muted-foreground">지출</span>
							<span className="text-sm font-semibold text-expense">
								{formatCurrency(summary.expense)}
							</span>
						</CardContent>
					</Card>
				</motion.div>
				<motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
					<Card className="overflow-hidden gap-0 py-0">
						<CardContent className="mesh-gradient-balance flex flex-col items-center gap-1 p-3">
							<Wallet className="h-4 w-4 text-primary" />
							<span className="text-xs text-muted-foreground">잔액</span>
							<span className={`text-sm font-semibold ${summary.balance >= 0 ? "text-income" : "text-expense"}`}>
								{formatCurrency(summary.balance)}
							</span>
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</div>
	);
}
