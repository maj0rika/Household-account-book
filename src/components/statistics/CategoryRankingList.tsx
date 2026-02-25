"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";

import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CategoryRanking } from "@/server/actions/statistics";

interface CategoryRankingListProps {
	data: CategoryRanking[];
	selectedCategoryId?: string | null;
	month: string;
}

const itemVariants = {
	hidden: { opacity: 0, x: -12 },
	visible: (i: number) => ({
		opacity: 1,
		x: 0,
		transition: { delay: i * 0.06, duration: 0.3, ease: "easeOut" as const },
	}),
};

export function CategoryRankingList({ data, selectedCategoryId, month }: CategoryRankingListProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const filteredData = useMemo(() => {
		if (!selectedCategoryId) return data;
		return data.filter((item) => item.categoryId === selectedCategoryId);
	}, [data, selectedCategoryId]);

	const clearCategoryFilter = () => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("category");
		params.set("month", month);
		router.push(`/statistics?${params.toString()}`);
	};

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
					<Button size="sm" variant="outline" onClick={clearCategoryFilter}>전체 보기</Button>
				</div>
				<p className="py-8 text-center text-sm text-muted-foreground">선택한 카테고리 내역이 없습니다.</p>
			</div>
		);
	}

	const renderData = filteredData;
	const maxAmount = renderData[0]?.amount ?? 1;

	return (
		<motion.div
			className="rounded-xl border border-border bg-card p-4"
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay: 0.15 }}
		>
			<div className="mb-3 flex items-center justify-between gap-2">
				<h3 className="text-sm font-semibold">카테고리별 지출</h3>
				{selectedCategoryId && (
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="text-[11px]">상세 필터 적용됨</Badge>
						<Button size="sm" variant="outline" onClick={clearCategoryFilter}>전체 보기</Button>
					</div>
				)}
			</div>
			<div className="space-y-3">
				{renderData.map((item, index) => (
					<motion.div
						key={item.categoryId}
						className="space-y-1"
						custom={index}
						variants={itemVariants}
						initial="hidden"
						animate="visible"
					>
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
							<motion.div
								className="h-full rounded-full bg-primary/70"
								initial={{ width: 0 }}
								animate={{ width: `${(item.amount / maxAmount) * 100}%` }}
								transition={{ delay: 0.3 + index * 0.06, duration: 0.5, ease: "easeOut" }}
							/>
						</div>
					</motion.div>
				))}
			</div>
		</motion.div>
	);
}
