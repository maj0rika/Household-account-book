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
import { MonthlyTrendChart } from "@/components/statistics/MonthlyTrendChart";
import { StatisticsRankingSection } from "@/components/statistics/StatisticsLazySections";
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

function TrendFallback() {
	return (
		<>
			<Separator className="my-2" />
			<div className="space-y-2 px-4 py-2">
				<Skeleton className="h-5 w-24" />
				<Skeleton className="h-40 w-full" />
			</div>
		</>
	);
}

function RankingFallback() {
	return (
		<>
			<Separator className="my-2" />
			<div className="space-y-2 px-4 py-2">
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

async function StatisticsTrendSection() {
	// 추이 차트는 선택 카테고리와 무관한 공통 맥락 정보라
	// 랭킹 쿼리보다 먼저 풀어 사용자가 "이번 화면이 어느 기간의 통계인지"를 빠르게 파악하게 한다.
	const trend = await getMonthlyTrend(6);

	return (
		<>
			<Separator className="my-2" />
			<div className="px-4 py-2">
				<MonthlyTrendChart data={trend} />
			</div>
		</>
	);
}

async function StatisticsRankingServerSection({
	month,
	selectedCategoryId,
}: {
	month: string;
	selectedCategoryId: string | null;
}) {
	// 랭킹 영역은 선택된 카테고리와 "전체 보기" 링크를 함께 다뤄야 하므로
	// 서버에서 clear href를 완성해 내려 클라이언트 라우터 훅 없이도 같은 화면 상태를 복원할 수 있게 한다.
	const ranking = await getCategoryRanking(month);
	const params = new URLSearchParams();
	params.set("month", month);
	const clearCategoryHref = `/statistics?${params.toString()}`;

	return (
		<>
			<Separator className="my-2" />
			<StatisticsRankingSection
				ranking={ranking}
				selectedCategoryId={selectedCategoryId}
				clearCategoryHref={clearCategoryHref}
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
			<h1 className="sr-only">통계</h1>
			{/* 통계 화면은 "월 이동 -> 요약 -> 추이 -> 랭킹" 순서로 정보를 쌓는다.
				각 구간을 개별 Suspense로 분리해 하단 랭킹이 느려도 상단 맥락 카드와 차트는 먼저 읽히게 한다. */}
			<Suspense fallback={<MonthNavigatorFallback />}>
				<MonthNavigator month={month} />
			</Suspense>

			<Suspense fallback={<SummaryFallback />}>
				<StatisticsSummarySection month={month} />
			</Suspense>

			<Suspense fallback={<TrendFallback />}>
				<StatisticsTrendSection />
			</Suspense>

			<Suspense fallback={<RankingFallback />}>
				<StatisticsRankingServerSection month={month} selectedCategoryId={selectedCategoryId} />
			</Suspense>
		</div>
	);
}
