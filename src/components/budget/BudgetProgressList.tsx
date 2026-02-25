"use client";

import { formatCurrency } from "@/lib/format";
import type { BudgetWithSpent } from "@/server/actions/budget";

interface BudgetProgressListProps {
	budgets: BudgetWithSpent[];
}

export function BudgetProgressList({ budgets }: BudgetProgressListProps) {
	if (budgets.length === 0) {
		return (
			<div className="rounded-xl border border-border bg-card p-4">
				<p className="py-8 text-center text-sm text-muted-foreground">
					설정된 예산이 없습니다. 아래에서 예산을 추가하세요.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3 px-4">
			{budgets.map((b) => {
				const isOver = b.percentage > 100;
				const barWidth = Math.min(b.percentage, 100);

				return (
					<div key={b.id} className="rounded-xl border border-border bg-card p-4">
						<div className="mb-2 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span className="text-base">{b.categoryIcon}</span>
								<span className="text-sm font-medium">{b.categoryName}</span>
							</div>
							<span className={`text-xs font-semibold ${isOver ? "text-destructive" : "text-muted-foreground"}`}>
								{b.percentage.toFixed(0)}%
							</span>
						</div>
						<div className="mb-1.5 h-2.5 rounded-full bg-muted">
							<div
								className={`h-full rounded-full transition-all ${isOver ? "bg-destructive" : "bg-primary"}`}
								style={{ width: `${barWidth}%` }}
							/>
						</div>
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>{formatCurrency(b.spent)} 사용</span>
							<span>{formatCurrency(b.amount)} 예산</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}
