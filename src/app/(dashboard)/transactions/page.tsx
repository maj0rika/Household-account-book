import { Suspense } from "react";

import {
	getTransactions,
	getMonthlySummary,
	getCategoryBreakdown,
	getDailyExpenses,
	getMonthlyCalendarData,
} from "@/server/actions/transaction";
import { autoApplyRecurringTransactions } from "@/server/actions/recurring";
import { getCurrentMonth } from "@/lib/format";
import { MonthlySummaryCard } from "@/components/dashboard/MonthlySummaryCard";
import { MonthNavigator } from "@/components/dashboard/MonthNavigator";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { WeeklyBarChart } from "@/components/dashboard/WeeklyBarChart";
import { CalendarView } from "@/components/dashboard/CalendarView";
import { TransactionList } from "@/components/transaction/TransactionList";
import { TransactionInputSection } from "@/components/transaction/TransactionInputSection";
import { RecurringTransactionManager } from "@/components/transaction/RecurringTransactionManager";
import { Separator } from "@/components/ui/separator";

interface Props {
	searchParams: Promise<{ month?: string }>;
}

export default async function TransactionsPage({ searchParams }: Props) {
	const params = await searchParams;
	const month = params.month ?? getCurrentMonth();

	// 고정 거래 자동 적용 (오늘 날짜 기준, 중복 방지 내장)
	await autoApplyRecurringTransactions();

	// 주간 차트용: 최근 7일 범위
	const today = new Date();
	const weekAgo = new Date();
	weekAgo.setDate(today.getDate() - 6);
	const startDate = weekAgo.toISOString().split("T")[0];
	const endDate = new Date(today.getTime() + 86400000).toISOString().split("T")[0];

	const [transactions, summary, categoryBreakdown, dailyExpenses, calendarData] = await Promise.all([
		getTransactions(month),
		getMonthlySummary(month),
		getCategoryBreakdown(month),
		getDailyExpenses(startDate, endDate),
		getMonthlyCalendarData(month),
	]);

	return (
		<>
			<Suspense>
				<MonthNavigator month={month} />
			</Suspense>
			<MonthlySummaryCard summary={summary} month={month} />
			<Separator className="my-2" />
			<CalendarView month={month} data={calendarData} />
			<Separator className="my-2" />
			<WeeklyBarChart data={dailyExpenses} />
			<Separator className="my-2" />
			<CategoryPieChart data={categoryBreakdown} />
			<Separator className="my-2" />
			<RecurringTransactionManager />
			<Separator className="my-2" />
			<TransactionList transactions={transactions} />
			<Suspense>
				<TransactionInputSection />
			</Suspense>
		</>
	);
}
