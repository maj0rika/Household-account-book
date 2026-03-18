"use client";

import { useState, useMemo } from "react";

import { CalendarView } from "@/components/dashboard/CalendarView";
import { DayTransactionSheet } from "@/components/dashboard/DayTransactionSheet";
import type { Transaction, Category } from "@/types";

interface InteractiveCalendarProps {
	month: string;
	calendarData: Record<string, { income: number; expense: number }>;
	transactionsByDate: Record<string, Transaction[]>;
	categories: Category[];
}

export function InteractiveCalendar({ month, calendarData, transactionsByDate, categories }: InteractiveCalendarProps) {
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const dayTransactions = useMemo(
		() => (selectedDate ? (transactionsByDate[selectedDate] ?? []) : []),
		[selectedDate, transactionsByDate],
	);

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
