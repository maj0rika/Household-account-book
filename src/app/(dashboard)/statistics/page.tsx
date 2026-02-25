import { Suspense } from "react";

import { getMonthlyTrend, getCategoryRanking } from "@/server/actions/statistics";
import { getMonthlySummary } from "@/server/actions/transaction";
import { getCurrentMonth } from "@/lib/format";
import { MonthNavigator } from "@/components/dashboard/MonthNavigator";
import { MonthlySummaryCard } from "@/components/dashboard/MonthlySummaryCard";
import { StatisticsLazySections } from "@/components/statistics/StatisticsLazySections";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
	searchParams: Promise<{ month?: string; category?: string }>;
}

function SummaryFallback() {
	return (
		<div className="space-y-2 px-4 py-2">
			<Skeleton className="h-6 w-40" />
			<Skeleton className="h-20 w-full" />
		</div>
	);
}

function DetailFallback() {
	return (
		<>
			<Separator className="my-2" />
			<div className="space-y-2 px-4 py-2">
				<Skeleton className="h-5 w-24" />
				<Skeleton className="h-40 w-full" />
				<Skeleton className="h-5 w-28" />
				<Skeleton className="h-28 w-full" />
			</div>
		</>
	);
}

async function StatisticsSummarySection({ month }: { month: string }) {
	const summary = await getMonthlySummary(month);
	return <MonthlySummaryCard summary={summary} month={month} />;
}

async function StatisticsDetailSection({
	month,
	selectedCategoryId,
}: {
	month: string;
	selectedCategoryId: string | null;
}) {
	const [trend, ranking] = await Promise.all([
		getMonthlyTrend(6),
		getCategoryRanking(month),
	]);

	return (
		<>
			<Separator className="my-2" />
			<StatisticsLazySections
				trend={trend}
				ranking={ranking}
				selectedCategoryId={selectedCategoryId}
				month={month}
			/>
		</>
	);
}

export default async function StatisticsPage({ searchParams }: Props) {
	const params = await searchParams;
	const month = params.month ?? getCurrentMonth();
	const selectedCategoryId = params.category ?? null;

	return (
		<div className="pb-28 md:pb-24">
			<Suspense>
				<MonthNavigator month={month} />
			</Suspense>

			<Suspense fallback={<SummaryFallback />}>
				<StatisticsSummarySection month={month} />
			</Suspense>

			<Suspense fallback={<DetailFallback />}>
				<StatisticsDetailSection month={month} selectedCategoryId={selectedCategoryId} />
			</Suspense>
		</div>
	);
}
