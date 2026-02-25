import { Suspense } from "react";

import { getMonthlyTrend, getCategoryRanking } from "@/server/actions/statistics";
import { getMonthlySummary } from "@/server/actions/transaction";
import { getCurrentMonth } from "@/lib/format";
import { MonthNavigator } from "@/components/dashboard/MonthNavigator";
import { MonthlySummaryCard } from "@/components/dashboard/MonthlySummaryCard";
import { MonthlyTrendChart } from "@/components/statistics/MonthlyTrendChart";
import { CategoryRankingList } from "@/components/statistics/CategoryRankingList";
import { Separator } from "@/components/ui/separator";

interface Props {
	searchParams: Promise<{ month?: string }>;
}

export default async function StatisticsPage({ searchParams }: Props) {
	const params = await searchParams;
	const month = params.month ?? getCurrentMonth();

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
			<div className="px-4 py-2">
				<MonthlyTrendChart data={trend} />
			</div>
			<Separator className="my-2" />
			<div className="px-4 py-2">
				<CategoryRankingList data={ranking} />
			</div>
		</div>
	);
}
