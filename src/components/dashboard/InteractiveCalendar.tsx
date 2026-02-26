"use client";

import { useState, useMemo } from "react";

import { CalendarView } from "@/components/dashboard/CalendarView";
import { DayTransactionSheet } from "@/components/dashboard/DayTransactionSheet";
import type { Transaction, Category } from "@/types";

interface InteractiveCalendarProps {
	month: string;
	calendarData: Record<string, { income: number; expense: number }>;
	transactions: Transaction[];
	categories: Category[];
}

export function InteractiveCalendar({ month, calendarData, transactions, categories }: InteractiveCalendarProps) {
	const [selectedDate, setSelectedDate] = useState<string | null>(null);

	// 날짜별 거래 Map 사전 구성 — 매 선택마다 filter() 대신 O(1) 조회
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
			<CalendarView
				month={month}
				data={calendarData}
				selectedDate={selectedDate}
				onDateSelect={setSelectedDate}
			/>
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
