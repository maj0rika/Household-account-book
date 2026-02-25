"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "motion/react";
import { formatCurrency } from "@/lib/format";
import type { CategoryBreakdown } from "@/types";

const COLORS = [
	"oklch(0.55 0.17 155)",
	"oklch(0.65 0.20 165)",
	"oklch(0.45 0.12 145)",
	"oklch(0.75 0.15 135)",
	"oklch(0.60 0.10 175)",
	"oklch(0.50 0.14 185)",
	"oklch(0.70 0.12 125)",
	"oklch(0.58 0.16 195)",
	"oklch(0.68 0.08 155)",
	"oklch(0.42 0.10 165)",
	"oklch(0.78 0.10 145)",
	"oklch(0.55 0.12 200)",
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
		<motion.div
			className="px-4 py-2"
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay: 0.15 }}
		>
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
								animationDuration={800}
								animationBegin={200}
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
						<motion.div
							key={item.categoryId}
							className="flex items-center gap-2 text-xs"
							initial={{ opacity: 0, x: 12 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.3 + index * 0.06, duration: 0.3 }}
						>
							<span
								className="h-2.5 w-2.5 shrink-0 rounded-full"
								style={{ backgroundColor: COLORS[index % COLORS.length] }}
							/>
							<span className="truncate">{item.categoryIcon} {item.categoryName}</span>
							<span className="ml-auto shrink-0 font-medium">{item.percentage}%</span>
						</motion.div>
					))}
					{data.length > 5 && (
						<span className="text-[10px] text-muted-foreground">+{data.length - 5}개 더</span>
					)}
				</div>
			</div>
		</motion.div>
	);
}
