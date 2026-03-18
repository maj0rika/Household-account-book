"use client";

import { useId, useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { motion } from "motion/react";

import { blurActiveElement } from "@/lib/accessibility";
import { formatCurrency, getKSTDate, formatDateLocal } from "@/lib/format";
import { DayTransactionSheet } from "@/components/dashboard/DayTransactionSheet";
import type { DailyExpense, Transaction, Category } from "@/types";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function formatDayLabel(dateStr: string): string {
	const d = new Date(dateStr + "T00:00:00");
	return DAY_NAMES[d.getDay()];
}

function formatFullDateLabel(dateStr: string): string {
	const d = new Date(`${dateStr}T00:00:00`);
	return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${DAY_NAMES[d.getDay()]}요일`;
}

interface WeeklyBarChartProps {
	data: DailyExpense[];
	weekDates: string[];
	transactionsByDate: Record<string, Transaction[]>;
	categories: Category[];
}

export function WeeklyBarChart({ data, weekDates, transactionsByDate, categories }: WeeklyBarChartProps) {
	const chartId = useId();
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const titleId = `${chartId}-title`;
	const descriptionId = `${chartId}-description`;
	const selectedStatusId = `${chartId}-selected-status`;

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
		// 같은 날짜를 다시 누르면 선택을 해제하고,
		// 다른 날짜를 누르면 DayTransactionSheet가 읽을 날짜를 교체한다.
		blurActiveElement();
		setSelectedDate((prev) => (prev === date ? null : date));
	};

	const dayTransactions = useMemo(
		() => (selectedDate ? (transactionsByDate[selectedDate] ?? []) : []),
		[selectedDate, transactionsByDate],
	);
	const selectedEntry = selectedDate ? chartData.find((entry) => entry.date === selectedDate) : null;

	return (
		<>
			<motion.div
				className="px-4 py-2"
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, delay: 0.1 }}
			>
				<div className="mb-3">
					<h3 id={titleId} className="text-sm font-semibold">주간 지출</h3>
					<p id={descriptionId} className="sr-only">
						차트는 시각 요약용입니다. 아래 날짜 버튼으로 해당 날짜의 상세 거래를 열 수 있습니다.
					</p>
				</div>
				{maxAmount <= 1 ? (
					<div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
						해당 주간 구간 지출이 없습니다
					</div>
				) : (
					<div className="space-y-3">
						<div aria-hidden="true">
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
						</div>
						<div>
							<p className="mb-1.5 text-[11px] text-muted-foreground">
								날짜 버튼으로 상세를 확인할 수 있습니다.
							</p>
							<ul className="flex flex-wrap gap-1.5">
								{chartData.map((entry) => (
									<li key={entry.date}>
										<button
											type="button"
											aria-pressed={entry.isSelected}
											aria-label={`${formatFullDateLabel(entry.date)}, 지출 ${formatCurrency(entry.amount)}${entry.isToday ? ", 오늘" : ""}${entry.isSelected ? ", 선택됨" : ""}`}
											className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											onClick={() => handleSelectDay(entry.date)}
										>
											<span className={entry.isSelected ? "font-semibold text-foreground" : ""}>{entry.label}</span>
											<span className="tabular-nums">{formatCurrency(entry.amount)}</span>
										</button>
									</li>
								))}
							</ul>
						</div>
					</div>
				)}
			</motion.div>

			{selectedEntry && (
				<p id={selectedStatusId} className="sr-only" aria-live="polite">
					{formatFullDateLabel(selectedEntry.date)}가 선택되었습니다. 지출 {formatCurrency(selectedEntry.amount)}입니다.
				</p>
			)}
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
