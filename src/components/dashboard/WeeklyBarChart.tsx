"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import type { DailyExpense } from "@/types";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function formatDayLabel(dateStr: string): string {
	const d = new Date(dateStr + "T00:00:00");
	return DAY_NAMES[d.getDay()];
}

export function WeeklyBarChart({ data }: { data: DailyExpense[] }) {
	const today = new Date().toISOString().split("T")[0];

	// 최근 7일 채우기 (데이터 없는 날은 0)
	const last7 = Array.from({ length: 7 }, (_, i) => {
		const d = new Date();
		d.setDate(d.getDate() - (6 - i));
		return d.toISOString().split("T")[0];
	});

	const dataMap = new Map(data.map((d) => [d.date, d.amount]));
	const chartData = last7.map((date) => ({
		date,
		label: formatDayLabel(date),
		amount: dataMap.get(date) ?? 0,
		isToday: date === today,
	}));

	const maxAmount = Math.max(...chartData.map((d) => d.amount), 1);

	return (
		<div className="px-4 py-2">
			<h3 className="mb-3 text-sm font-semibold">주간 지출</h3>
			{maxAmount <= 1 ? (
				<div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
					최근 7일간 지출이 없습니다
				</div>
			) : (
				<ResponsiveContainer width="100%" height={120}>
					<BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
						<XAxis
							dataKey="label"
							axisLine={false}
							tickLine={false}
							tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
						/>
						<YAxis hide domain={[0, maxAmount * 1.1]} />
						<Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={28}>
							{chartData.map((entry, index) => (
								<Cell
									key={index}
									fill={entry.isToday ? "var(--primary)" : "var(--muted)"}
								/>
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			)}
		</div>
	);
}
