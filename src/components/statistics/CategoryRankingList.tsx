"use client";

import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import type { CategoryRanking } from "@/server/actions/statistics";

interface CategoryRankingListProps {
	data: CategoryRanking[];
}

export function CategoryRankingList({ data }: CategoryRankingListProps) {
	if (data.length === 0) {
		return (
			<div className="rounded-xl border border-border bg-card p-4">
				<h3 className="mb-3 text-sm font-semibold">카테고리별 지출</h3>
				<p className="py-8 text-center text-sm text-muted-foreground">이번 달 지출 내역이 없습니다.</p>
			</div>
		);
	}

	const maxAmount = data[0]?.amount ?? 1;

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<h3 className="mb-3 text-sm font-semibold">카테고리별 지출</h3>
			<div className="space-y-3">
				{data.map((item) => (
					<div key={item.categoryId} className="space-y-1">
						<div className="flex items-center justify-between text-sm">
							<div className="flex items-center gap-2">
								<span className="text-base">{item.categoryIcon}</span>
								<span className="font-medium">{item.categoryName}</span>
								<span className="text-xs text-muted-foreground">{item.count}건</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="font-semibold">{formatCurrency(item.amount)}</span>
								<Badge variant="outline" className="text-[10px] px-1.5 py-0">
									{item.percentage}%
								</Badge>
							</div>
						</div>
						<div className="h-2 rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-primary/70 transition-all"
								style={{ width: `${(item.amount / maxAmount) * 100}%` }}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
