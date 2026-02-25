"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { motion } from "motion/react";
import type { MonthlyTrend } from "@/server/actions/statistics";

interface MonthlyTrendChartProps {
	data: MonthlyTrend[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
	const chartData = data.map((d) => ({
		month: d.month.slice(5),
		수입: d.income,
		지출: d.expense,
	}));

	return (
		<motion.div
			className="rounded-xl border border-border bg-card p-4"
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay: 0.1 }}
		>
			<h3 className="mb-3 text-sm font-semibold">월별 수입/지출 추이</h3>
			<ResponsiveContainer width="100%" height={220}>
				<BarChart data={chartData} barGap={2}>
					<CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
					<XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
					<YAxis
						tick={{ fontSize: 11 }}
						tickLine={false}
						axisLine={false}
						tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
						width={40}
					/>
					<Legend
						iconType="circle"
						iconSize={8}
						wrapperStyle={{ fontSize: 12 }}
					/>
					<Bar dataKey="수입" fill="var(--income)" radius={[4, 4, 0, 0]} maxBarSize={24} animationDuration={800} />
					<Bar dataKey="지출" fill="var(--expense)" radius={[4, 4, 0, 0]} maxBarSize={24} animationDuration={800} />
				</BarChart>
			</ResponsiveContainer>
		</motion.div>
	);
}
