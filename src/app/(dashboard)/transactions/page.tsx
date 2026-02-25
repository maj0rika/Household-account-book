import { Suspense } from "react";

import {
	getTransactions,
	getMonthlySummary,
	getCategoryBreakdown,
	getDailyExpenses,
	getMonthlyCalendarData,
	getUserCategories,
} from "@/server/actions/transaction";
import { autoApplyRecurringTransactions } from "@/server/actions/recurring";
import { getCurrentMonth } from "@/lib/format";
import { MonthlySummaryCard } from "@/components/dashboard/MonthlySummaryCard";
import { MonthNavigator } from "@/components/dashboard/MonthNavigator";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { WeeklyBarChart } from "@/components/dashboard/WeeklyBarChart";
import { InteractiveCalendar } from "@/components/dashboard/InteractiveCalendar";
import { FilterableTransactionList } from "@/components/transaction/FilterableTransactionList";
import { RecurringTransactionManager } from "@/components/transaction/RecurringTransactionManager";
import { Separator } from "@/components/ui/separator";

interface Props {
	searchParams: Promise<{ month?: string; focusDate?: string }>;
}

function formatDateLocal(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function getWeeklyRangeByMonth(month: string): { weekDates: string[]; startDate: string; endDateExclusive: string } {
	const [year, monthNum] = month.split("-").map(Number);
	const monthStart = new Date(year, monthNum - 1, 1);
	const monthEnd = new Date(year, monthNum, 0);

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === monthNum;
	const rangeEnd = isCurrentMonth ? today : monthEnd;

	const rangeStart = new Date(rangeEnd);
	rangeStart.setDate(rangeEnd.getDate() - 6);
	if (rangeStart < monthStart) {
		rangeStart.setTime(monthStart.getTime());
	}

	const weekDates: string[] = [];
	const cursor = new Date(rangeStart);
	while (cursor <= rangeEnd) {
		weekDates.push(formatDateLocal(cursor));
		cursor.setDate(cursor.getDate() + 1);
	}

	const endExclusive = new Date(rangeEnd);
	endExclusive.setDate(endExclusive.getDate() + 1);

	return {
		weekDates,
		startDate: formatDateLocal(rangeStart),
		endDateExclusive: formatDateLocal(endExclusive),
	};
}

export default async function TransactionsPage({ searchParams }: Props) {
	const params = await searchParams;
	const month = params.month ?? getCurrentMonth();
	const rawFocusDate = params.focusDate ?? null;

	// 고정 거래 자동 적용 (오늘 날짜 기준, 중복 방지 내장)
	await autoApplyRecurringTransactions();

	const { weekDates, startDate, endDateExclusive } = getWeeklyRangeByMonth(month);
	const focusDate = rawFocusDate && weekDates.includes(rawFocusDate) ? rawFocusDate : null;

	const [transactions, summary, categoryBreakdown, dailyExpenses, calendarData, userCategories] =
		await Promise.all([
			getTransactions(month),
			getMonthlySummary(month),
			getCategoryBreakdown(month),
			getDailyExpenses(startDate, endDateExclusive),
			getMonthlyCalendarData(month),
			getUserCategories(),
		]);

	return (
		<div className="pb-28 md:pb-24">
			<Suspense>
				<MonthNavigator month={month} />
			</Suspense>
			<MonthlySummaryCard summary={summary} month={month} />
			<Separator className="my-2" />
			<InteractiveCalendar
				month={month}
				calendarData={calendarData}
				transactions={transactions}
				categories={userCategories}
			/>
			<Separator className="my-2" />
			<WeeklyBarChart data={dailyExpenses} weekDates={weekDates} selectedDate={focusDate} />
			<Separator className="my-2" />
			<CategoryPieChart data={categoryBreakdown} month={month} />
			<Separator className="my-2" />
			<RecurringTransactionManager />
			<Separator className="my-2" />
			<FilterableTransactionList transactions={transactions} categories={userCategories} focusDate={focusDate} />
		</div>
	);
}
