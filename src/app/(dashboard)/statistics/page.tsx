// 파일 역할:
// - App Router 페이지 엔트리 파일이다.
// 사용 위치:
// - App Router가 `/statistics` 경로를 렌더링할 때 직접 사용한다;
// 흐름:
// - 라우트 진입점에서 필요한 데이터 조회와 화면 조합을 맡고, 세부 상호작용은 하위 컴포넌트로 위임한다;
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

function MonthNavigatorFallback() {
	return (
		<div className="flex flex-col items-center justify-center gap-1 py-3">
			<div className="flex items-center justify-center gap-2">
				<Skeleton className="h-8 w-8 rounded-md" />
				<Skeleton className="h-8 w-[148px] rounded-md" />
				<Skeleton className="h-8 w-8 rounded-md" />
			</div>
		</div>
	);
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
	// 상단 요약은 월 이동 직후 가장 먼저 읽히는 카드라 별도 섹션으로 분리한다.
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
	// 추이와 카테고리 랭킹은 서로 다른 쿼리지만 둘 다 상세 영역에만 쓰이므로
	// 한 섹션 안에서 병렬 조회 후 지연 렌더링한다.
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
	// 카테고리 선택은 URL 쿼리로 들고 다녀 월 이동과 공유 링크에도 같은 상태를 유지한다.
	const selectedCategoryId = params.category ?? null;

	return (
		<div className="pb-28 md:pb-24">
			<Suspense fallback={<MonthNavigatorFallback />}>
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
