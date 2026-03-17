"use client";

import dynamic from "next/dynamic";

import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { WeeklyBarChart } from "@/components/dashboard/WeeklyBarChart";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useRenderPerf } from "@/hooks/useRenderPerf";
import type { DailyExpense, Category, CategoryBreakdown, Transaction, Account } from "@/types";

// Recharts 차트는 Turbopack dev에서 동적 청크 로딩 실패를 줄이기 위해 정적 import로 유지한다.
function SectionLoading({ title, rows = 3 }: { title: string; rows?: number }) {
	return (
		<div className="px-4 py-2">
			<h3 className="mb-3 text-sm font-semibold">{title}</h3>
			<div className="space-y-2">
				{Array.from({ length: rows }).map((_, i) => (
					<Skeleton key={i} className="h-4 w-full" />
				))}
			</div>
		</div>
	);
}

const RecurringTransactionManager = dynamic(
	() => import("@/components/transaction/RecurringTransactionManager").then((m) => m.RecurringTransactionManager),
	{
		ssr: false,
		loading: () => <SectionLoading title="고정 수입/지출" rows={3} />,
	},
);

const FilterableTransactionList = dynamic(
	() => import("@/components/transaction/FilterableTransactionList").then((m) => m.FilterableTransactionList),
	{
		ssr: false,
		loading: () => <SectionLoading title="거래 내역" rows={6} />,
	},
);

interface TransactionsLazySectionsProps {
	dailyExpenses: DailyExpense[];
	weekDates: string[];
	categoryBreakdown: CategoryBreakdown[];
	month: string;
	transactions: Transaction[];
	categories: Category[];
	accounts: Account[];
}

export function TransactionsLazySections({
	dailyExpenses,
	weekDates,
	categoryBreakdown,
	month,
	transactions,
	categories,
	accounts,
}: TransactionsLazySectionsProps) {
	useRenderPerf("transactions-lazy-sections");

	return (
		<div>
			<Separator className="my-2" />
			<WeeklyBarChart data={dailyExpenses} weekDates={weekDates} transactions={transactions} categories={categories} />
			<Separator className="my-2" />
			<CategoryPieChart data={categoryBreakdown} month={month} />
			<Separator className="my-2" />
			<RecurringTransactionManager />
			<Separator className="my-2" />
			<FilterableTransactionList transactions={transactions} categories={categories} accounts={accounts} />
		</div>
	);
}
