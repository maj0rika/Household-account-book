"use client";

import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { MonthlySummary } from "@/types";

export function MonthlySummaryCard({ summary, month }: { summary: MonthlySummary; month: string }) {
	const [, m] = month.split("-").map(Number);

	return (
		<div className="px-4 pt-4">
			<h2 className="mb-3 text-lg font-semibold">{m}월 요약</h2>
			<div className="grid grid-cols-3 gap-2">
				<Card>
					<CardContent className="flex flex-col items-center gap-1 p-3">
						<TrendingUp className="h-4 w-4 text-blue-500" />
						<span className="text-xs text-muted-foreground">수입</span>
						<span className="text-sm font-semibold text-blue-600">
							{formatCurrency(summary.income)}
						</span>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex flex-col items-center gap-1 p-3">
						<TrendingDown className="h-4 w-4 text-red-500" />
						<span className="text-xs text-muted-foreground">지출</span>
						<span className="text-sm font-semibold text-red-600">
							{formatCurrency(summary.expense)}
						</span>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex flex-col items-center gap-1 p-3">
						<Wallet className="h-4 w-4 text-green-500" />
						<span className="text-xs text-muted-foreground">잔액</span>
						<span className={`text-sm font-semibold ${summary.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
							{formatCurrency(summary.balance)}
						</span>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
