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

export default async function TransactionsPage({ searchParams }: Props) {
	const params = await searchParams;
	const month = params.month ?? getCurrentMonth();
	const focusDate = params.focusDate ?? null;

	// 고정 거래 자동 적용 (오늘 날짜 기준, 중복 방지 내장)
	await autoApplyRecurringTransactions();

	// 주간 차트용: 최근 7일 범위
	const today = new Date();
	const weekAgo = new Date();
	weekAgo.setDate(today.getDate() - 6);
	const startDate = weekAgo.toISOString().split("T")[0];
	const endDate = new Date(today.getTime() + 86400000).toISOString().split("T")[0];

	const [transactions, summary, categoryBreakdown, dailyExpenses, calendarData, userCategories] =
		await Promise.all([
			getTransactions(month),
			getMonthlySummary(month),
			getCategoryBreakdown(month),
			getDailyExpenses(startDate, endDate),
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
			<WeeklyBarChart data={dailyExpenses} selectedDate={focusDate} />
			<Separator className="my-2" />
			<CategoryPieChart data={categoryBreakdown} month={month} />
			<Separator className="my-2" />
			<RecurringTransactionManager />
			<Separator className="my-2" />
			<FilterableTransactionList transactions={transactions} categories={userCategories} focusDate={focusDate} />
		</div>
	);
}
