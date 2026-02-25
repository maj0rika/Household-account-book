"use client";

import { useState } from "react";

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

	const dayTransactions = selectedDate
		? transactions.filter((tx) => tx.date === selectedDate)
		: [];

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
