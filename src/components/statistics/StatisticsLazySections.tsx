"use client";

import dynamic from "next/dynamic";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryRanking } from "@/server/actions/statistics";

function SectionLoading({ title }: { title: string }) {
	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<h3 className="mb-3 text-sm font-semibold">{title}</h3>
			<div className="space-y-2">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-4/5" />
				<Skeleton className="h-4 w-3/5" />
			</div>
		</div>
	);
}

const MonthlyTrendChart = dynamic(
	() => import("@/components/statistics/MonthlyTrendChart").then((m) => m.MonthlyTrendChart),
	{
		ssr: false,
		loading: () => <SectionLoading title="월별 추이" />,
	},
);

const CategoryRankingList = dynamic(
	() => import("@/components/statistics/CategoryRankingList").then((m) => m.CategoryRankingList),
	{
		ssr: false,
		loading: () => <SectionLoading title="카테고리별 지출" />,
	},
);

interface StatisticsLazySectionsProps {
	trend: Array<{ month: string; income: number; expense: number }>;
	ranking: CategoryRanking[];
	selectedCategoryId: string | null;
	month: string;
}

export function StatisticsLazySections({
	trend,
	ranking,
	selectedCategoryId,
	month,
}: StatisticsLazySectionsProps) {
	return (
		<div style={{ contentVisibility: "auto", containIntrinsicBlockSize: "500px" }}>
			<div className="px-4 py-2">
				<MonthlyTrendChart data={trend} />
			</div>
			<Separator className="my-2" />
			<div className="px-4 py-2">
				<CategoryRankingList data={ranking} selectedCategoryId={selectedCategoryId} month={month} />
			</div>
		</div>
	);
}
