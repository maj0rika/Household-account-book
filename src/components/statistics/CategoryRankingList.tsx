// 파일 역할:
// - 통계 화면 하단의 카테고리별 지출 랭킹 카드를 그리는 프레젠테이션 컴포넌트다;
// 사용 위치:
// - `StatisticsRankingSection`이 서버에서 랭킹 데이터와 선택 상태를 정리한 뒤 이 컴포넌트에 전달한다;
// 흐름:
// - 이미 서버에서 정리된 데이터와 링크만 받아 렌더링만 수행하므로, 클라이언트 상태나 라우터 훅 없이 서버 렌더링이 가능하다;
import Link from "next/link";

import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CategoryRanking } from "@/server/actions/statistics";

interface CategoryRankingListProps {
	data: CategoryRanking[];
	selectedCategoryId?: string | null;
	clearCategoryHref: string;
}

export function CategoryRankingList({ data, selectedCategoryId, clearCategoryHref }: CategoryRankingListProps) {
	// 통계 상세는 로컬 상태가 아니라 URL의 `category` 쿼리를 진실 공급원으로 삼는다.
	const filteredData = selectedCategoryId
		? data.filter((item) => item.categoryId === selectedCategoryId)
		: data;

	if (data.length === 0) {
		return (
			<div className="rounded-xl border border-border bg-card p-4">
				<h3 className="mb-3 text-sm font-semibold">카테고리별 지출</h3>
				<p className="py-8 text-center text-sm text-muted-foreground">이번 달 지출 내역이 없습니다.</p>
			</div>
		);
	}

	if (selectedCategoryId && filteredData.length === 0) {
		return (
			<div className="rounded-xl border border-border bg-card p-4">
				<div className="mb-3 flex items-center justify-between">
					<h3 className="text-sm font-semibold">카테고리별 지출</h3>
					<Button size="sm" variant="outline" asChild>
						<Link href={clearCategoryHref}>전체 보기</Link>
					</Button>
				</div>
				<p className="py-8 text-center text-sm text-muted-foreground">선택한 카테고리 내역이 없습니다.</p>
			</div>
		);
	}

	const renderData = filteredData;
	// 랭킹 막대의 너비는 현재 렌더 목록 안에서 상대 비교를 해야 하므로
	// 전체 원본이 아니라 필터링된 결과의 최댓값을 기준점으로 사용한다.
	const maxAmount = renderData[0]?.amount ?? 1;

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<div className="mb-3 flex items-center justify-between gap-2">
				<h3 className="text-sm font-semibold">카테고리별 지출</h3>
				{selectedCategoryId && (
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="text-[11px]">상세 필터 적용됨</Badge>
						<Button size="sm" variant="outline" asChild>
							<Link href={clearCategoryHref}>전체 보기</Link>
						</Button>
					</div>
				)}
			</div>
			<div className="space-y-3">
				{renderData.map((item) => (
					<div key={item.categoryId} className="space-y-1">
						<div className="flex items-center justify-between text-sm">
							<div className="flex items-center gap-2">
								<span className="text-base">{item.categoryIcon}</span>
								<span className="font-medium">{item.categoryName}</span>
								<span className="text-xs text-muted-foreground">{item.count}건</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="font-semibold">{formatCurrency(item.amount)}</span>
								<Badge variant="outline" className="px-1.5 py-0 text-[10px]">
									{item.percentage}%
								</Badge>
							</div>
						</div>
						<div className="h-2 rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-primary/70"
								style={{ width: `${(item.amount / maxAmount) * 100}%` }}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
