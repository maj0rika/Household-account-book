import { Suspense } from "react";

import { getMonthlyTrend, getCategoryRanking } from "@/server/actions/statistics";
import { getMonthlySummary } from "@/server/actions/transaction";
import { getCurrentMonth } from "@/lib/format";
import { MonthNavigator } from "@/components/dashboard/MonthNavigator";
import { MonthlySummaryCard } from "@/components/dashboard/MonthlySummaryCard";
import { StatisticsLazySections } from "@/components/statistics/StatisticsLazySections";
import { Separator } from "@/components/ui/separator";

interface Props {
	searchParams: Promise<{ month?: string; category?: string }>;
}

export default async function StatisticsPage({ searchParams }: Props) {
	const params = await searchParams;
	const month = params.month ?? getCurrentMonth();
	const selectedCategoryId = params.category ?? null;

	const [trend, ranking, summary] = await Promise.all([
		getMonthlyTrend(6),
		getCategoryRanking(month),
		getMonthlySummary(month),
	]);

	return (
		<div className="pb-28 md:pb-24">
			<Suspense>
				<MonthNavigator month={month} />
			</Suspense>
			<MonthlySummaryCard summary={summary} month={month} />
			<Separator className="my-2" />
			<StatisticsLazySections
				trend={trend}
				ranking={ranking}
				selectedCategoryId={selectedCategoryId}
				month={month}
			/>
		</div>
	);
}
