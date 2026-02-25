"use client";

import dynamic from "next/dynamic";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { DailyExpense, Category, CategoryBreakdown, Transaction } from "@/types";

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

const WeeklyBarChart = dynamic(
	() => import("@/components/dashboard/WeeklyBarChart").then((m) => m.WeeklyBarChart),
	{
		ssr: false,
		loading: () => <SectionLoading title="주간 지출" rows={4} />,
	},
);

const CategoryPieChart = dynamic(
	() => import("@/components/dashboard/CategoryPieChart").then((m) => m.CategoryPieChart),
	{
		ssr: false,
		loading: () => <SectionLoading title="카테고리별 지출" rows={5} />,
	},
);

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
	focusDate: string | null;
	categoryBreakdown: CategoryBreakdown[];
	month: string;
	transactions: Transaction[];
	categories: Category[];
	listSectionId?: string;
}

export function TransactionsLazySections({
	dailyExpenses,
	weekDates,
	focusDate,
	categoryBreakdown,
	month,
	transactions,
	categories,
	listSectionId,
}: TransactionsLazySectionsProps) {
	return (
		<div style={{ contentVisibility: "auto", containIntrinsicSize: "700px" }}>
			<Separator className="my-2" />
			<WeeklyBarChart data={dailyExpenses} weekDates={weekDates} selectedDate={focusDate} />
			<Separator className="my-2" />
			<CategoryPieChart data={categoryBreakdown} month={month} />
			<Separator className="my-2" />
			<RecurringTransactionManager />
			<Separator className="my-2" />
			<div id={listSectionId}>
				<FilterableTransactionList transactions={transactions} categories={categories} focusDate={focusDate} />
			</div>
		</div>
	);
}
