"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/format";
import type { CategoryBreakdown } from "@/types";

const COLORS = [
	"#6366f1", "#f43f5e", "#f59e0b", "#10b981", "#3b82f6",
	"#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4",
	"#84cc16", "#a855f7",
];

export function CategoryPieChart({ data }: { data: CategoryBreakdown[] }) {
	if (data.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
				<p className="text-sm">이번 달 지출 내역이 없습니다</p>
			</div>
		);
	}

	const total = data.reduce((sum, d) => sum + d.amount, 0);

	return (
		<div className="px-4 py-2">
			<h3 className="mb-3 text-sm font-semibold">카테고리별 지출</h3>
			<div className="flex items-center gap-4">
				<div className="relative h-[140px] w-[140px] shrink-0">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={data}
								dataKey="amount"
								nameKey="categoryName"
								cx="50%"
								cy="50%"
								innerRadius={40}
								outerRadius={65}
								strokeWidth={2}
								stroke="var(--background)"
							>
								{data.map((_, index) => (
									<Cell key={index} fill={COLORS[index % COLORS.length]} />
								))}
							</Pie>
						</PieChart>
					</ResponsiveContainer>
					<div className="absolute inset-0 flex flex-col items-center justify-center">
						<span className="text-[10px] text-muted-foreground">총 지출</span>
						<span className="text-xs font-bold">{formatCurrency(total)}</span>
					</div>
				</div>
				<div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
					{data.slice(0, 5).map((item, index) => (
						<div key={item.categoryId} className="flex items-center gap-2 text-xs">
							<span
								className="h-2.5 w-2.5 shrink-0 rounded-full"
								style={{ backgroundColor: COLORS[index % COLORS.length] }}
							/>
							<span className="truncate">{item.categoryIcon} {item.categoryName}</span>
							<span className="ml-auto shrink-0 font-medium">{item.percentage}%</span>
						</div>
					))}
					{data.length > 5 && (
						<span className="text-[10px] text-muted-foreground">+{data.length - 5}개 더</span>
					)}
				</div>
			</div>
		</div>
	);
}
