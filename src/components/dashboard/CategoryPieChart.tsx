"use client";

// 파일 역할:
// - 거래 화면에서 월별 카테고리 지출 분포를 요약하고 통계 상세로 연결하는 클라이언트 컴포넌트다;
// 사용 위치:
// - `/transactions` 하단 인사이트 섹션에서 category breakdown 데이터를 받아 렌더링한다;
// 흐름:
// - 시각적인 파이 차트는 보조 요약으로만 쓰고, 실제 과업 경로는 텍스트 링크 목록과 숨겨진 추가 카테고리 패널로 제공한다;
import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell } from "recharts";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { CategoryBreakdown } from "@/types";

const COLORS = [
	"oklch(0.55 0.17 155)",
	"oklch(0.65 0.20 165)",
	"oklch(0.45 0.12 145)",
	"oklch(0.75 0.15 135)",
	"oklch(0.60 0.10 175)",
	"oklch(0.50 0.14 185)",
	"oklch(0.70 0.12 125)",
	"oklch(0.58 0.16 195)",
	"oklch(0.68 0.08 155)",
	"oklch(0.42 0.10 165)",
	"oklch(0.78 0.10 145)",
	"oklch(0.55 0.12 200)",
];

interface CategoryPieChartProps {
	data: CategoryBreakdown[];
	month: string;
}

export function CategoryPieChart({ data, month }: CategoryPieChartProps) {
	const chartId = useId();
	const router = useRouter();
	const [isExpanded, setIsExpanded] = useState(false);
	const titleId = `${chartId}-title`;
	const descriptionId = `${chartId}-description`;
	const remainingId = `${chartId}-remaining`;

	if (data.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
				<p className="text-sm">이번 달 지출 내역이 없습니다</p>
			</div>
		);
	}

	const total = data.reduce((sum, d) => sum + d.amount, 0);
	// 모바일 카드 높이를 과도하게 키우지 않기 위해 상위 5개만 먼저 보여주고,
	// 나머지는 명시적 토글을 통해 같은 링크 품질로 접근할 수 있게 분리한다.
	const visibleItems = data.slice(0, 5);
	const hiddenItems = data.slice(5);
	const getCategoryHref = (categoryId: string) =>
		`/statistics?month=${encodeURIComponent(month)}&category=${encodeURIComponent(categoryId)}`;

	const goToCategoryDetail = (categoryId: string) => {
		// 파이 슬라이스 클릭도 목록 링크와 같은 목적지로 정렬해 이동 경로를 단순화한다.
		router.push(getCategoryHref(categoryId));
	};

	return (
		<div className="px-4 py-2" aria-labelledby={titleId} aria-describedby={descriptionId}>
			<h3 id={titleId} className="mb-3 text-sm font-semibold">카테고리별 지출</h3>
			<p id={descriptionId} className="sr-only">
				파이 차트는 시각 요약용입니다. 아래 카테고리 버튼을 눌러 통계 상세 화면으로 이동할 수 있습니다.
			</p>
			<div className="flex items-center gap-4">
				{/* SVG 차트는 포인터 친화적 보조 표현으로만 두고,
					스크린리더와 키보드 사용자는 오른쪽 링크 목록을 주 경로로 사용하게 한다. */}
				<div className="relative h-[140px] w-[140px] shrink-0" aria-hidden="true">
					<PieChart width={140} height={140}>
						<Pie
							data={data}
							dataKey="amount"
							nameKey="categoryName"
							cx="50%"
							cy="50%"
							innerRadius={40}
							outerRadius={65}
							strokeWidth={2}
							stroke="var(--background)"
							animationDuration={800}
							animationBegin={200}
							onClick={(_, index) => {
								const target = typeof index === "number" ? data[index] : null;
								if (target) goToCategoryDetail(target.categoryId);
							}}
						>
							{data.map((_, index) => (
								<Cell key={index} fill={COLORS[index % COLORS.length]} style={{ cursor: "pointer" }} />
							))}
						</Pie>
					</PieChart>
					<div className="absolute inset-0 flex flex-col items-center justify-center">
						<span className="text-[10px] text-muted-foreground">총 지출</span>
						<span className="text-xs font-bold">{formatCurrency(total)}</span>
					</div>
				</div>
				<div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
					{visibleItems.map((item, index) => (
						<Link
							key={item.categoryId}
							href={getCategoryHref(item.categoryId)}
							prefetch={false}
							aria-label={`${item.categoryIcon} ${item.categoryName}, 지출 ${formatCurrency(item.amount)}, 전체의 ${item.percentage}%`}
							className="flex w-full items-center gap-2 text-left text-xs hover:opacity-80"
						>
							<span
								className="h-2.5 w-2.5 shrink-0 rounded-full"
								style={{ backgroundColor: COLORS[index % COLORS.length] }}
							/>
							<span className="truncate">{item.categoryIcon} {item.categoryName}</span>
							<span className="ml-auto shrink-0 font-medium">{item.percentage}%</span>
						</Link>
					))}
					{hiddenItems.length > 0 && (
						<>
							{/* "몇 개 더" 텍스트만 두면 접근 경로가 끊기므로,
								숨겨진 카테고리도 별도 패널 안에 동일한 링크 구조로 풀어 준다. */}
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 justify-start px-2 text-[11px] text-muted-foreground"
								aria-expanded={isExpanded}
								aria-controls={remainingId}
								onClick={() => setIsExpanded((prev) => !prev)}
							>
								{isExpanded ? "나머지 카테고리 접기" : `나머지 카테고리 ${hiddenItems.length}개 보기`}
							</Button>
							<div
								id={remainingId}
								className={isExpanded ? "flex flex-col gap-1.5" : "hidden"}
							>
								{hiddenItems.map((item, index) => (
									<Link
										key={item.categoryId}
										href={getCategoryHref(item.categoryId)}
										prefetch={false}
										aria-label={`${item.categoryIcon} ${item.categoryName}, 지출 ${formatCurrency(item.amount)}, 전체의 ${item.percentage}%`}
										className="flex w-full items-center gap-2 text-left text-xs hover:opacity-80"
									>
										<span
											className="h-2.5 w-2.5 shrink-0 rounded-full"
											style={{ backgroundColor: COLORS[(visibleItems.length + index) % COLORS.length] }}
										/>
										<span className="truncate">{item.categoryIcon} {item.categoryName}</span>
										<span className="ml-auto shrink-0 font-medium">{item.percentage}%</span>
									</Link>
								))}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
