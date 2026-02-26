"use client";

import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { motion } from "motion/react";

import { getKSTDate, formatDateLocal } from "@/lib/format";
import { DayTransactionSheet } from "@/components/dashboard/DayTransactionSheet";
import type { DailyExpense, Transaction, Category } from "@/types";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function formatDayLabel(dateStr: string): string {
	const d = new Date(dateStr + "T00:00:00");
	return DAY_NAMES[d.getDay()];
}

interface WeeklyBarChartProps {
	data: DailyExpense[];
	weekDates: string[];
	transactions: Transaction[];
	categories: Category[];
}

export function WeeklyBarChart({ data, weekDates, transactions, categories }: WeeklyBarChartProps) {
	const [selectedDate, setSelectedDate] = useState<string | null>(null);

	const dataMap = new Map(data.map((d) => [d.date, d.amount]));
	const todayStr = formatDateLocal(getKSTDate());
	const chartData = weekDates.map((date) => ({
		date,
		label: formatDayLabel(date),
		amount: dataMap.get(date) ?? 0,
		isSelected: selectedDate === date,
		isToday: date === todayStr,
	}));

	const maxAmount = Math.max(...chartData.map((d) => d.amount), 1);

	const handleSelectDay = (date: string) => {
		setSelectedDate((prev) => (prev === date ? null : date));
	};

	// 날짜별 거래 Map 사전 구성 — O(1) 조회
	const txByDate = useMemo(() => {
		const map = new Map<string, Transaction[]>();
		for (const tx of transactions) {
			const list = map.get(tx.date);
			if (list) {
				list.push(tx);
			} else {
				map.set(tx.date, [tx]);
			}
		}
		return map;
	}, [transactions]);

	const dayTransactions = selectedDate ? (txByDate.get(selectedDate) ?? []) : [];

	return (
		<>
			<motion.div
				className="px-4 py-2"
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, delay: 0.1 }}
			>
				<div className="mb-3">
					<h3 className="text-sm font-semibold">주간 지출</h3>
				</div>
				{maxAmount <= 1 ? (
					<div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
						해당 주간 구간 지출이 없습니다
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
							<Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={28} animationDuration={800}>
								{chartData.map((entry) => (
									<Cell
										key={entry.date}
										fill={entry.isSelected || entry.isToday ? "var(--primary)" : "var(--muted)"}
										style={{ cursor: "pointer", opacity: entry.isToday && !entry.isSelected ? 0.6 : 1 }}
										onClick={() => handleSelectDay(entry.date)}
									/>
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				)}
			</motion.div>

			{selectedDate && (
				<DayTransactionSheet
					open={!!selectedDate}
					onOpenChange={(open) => {
						if (!open) setSelectedDate(null);
					}}
					date={selectedDate}
					transactions={dayTransactions}
					categories={categories}
				/>
			)}
		</>
	);
}
