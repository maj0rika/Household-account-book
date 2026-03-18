"use client";

import { Fragment, useId } from "react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

import { formatCurrency } from "@/lib/format";
import type { MonthlyTrend } from "@/server/actions/statistics";

interface MonthlyTrendChartProps {
	data: MonthlyTrend[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
	const chartId = useId();
	const titleId = `${chartId}-title`;
	const descriptionId = `${chartId}-description`;
	// 서버 trend 응답을 Recharts가 바로 읽는 프레젠테이션 전용 shape로 한 번 변환한다.
	const chartData = data.map((d) => ({
		month: d.month.slice(5),
		수입: d.income,
		지출: d.expense,
	}));
	const summaryRows = data.map((d) => ({
		monthLabel: `${d.month.slice(0, 4)}년 ${Number(d.month.slice(5))}월`,
		income: d.income,
		expense: d.expense,
	}));

	return (
		<div
			className="rounded-xl border border-border bg-card p-4"
			aria-labelledby={titleId}
			aria-describedby={descriptionId}
		>
			<h3 id={titleId} className="mb-3 text-sm font-semibold">월별 수입/지출 추이</h3>
			<p id={descriptionId} className="sr-only">
				월별 수입과 지출을 비교하는 차트입니다. 시각 차트 아래 텍스트 요약에서 각 월의 수치를 확인할 수 있습니다.
			</p>
			<div aria-hidden="true">
				<ResponsiveContainer width="100%" height={220}>
					<BarChart data={chartData} barGap={2}>
						<CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
						<XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
						<YAxis
							tick={{ fontSize: 11 }}
							tickLine={false}
							axisLine={false}
							tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
							width={40}
						/>
						<Legend
							iconType="circle"
							iconSize={8}
							wrapperStyle={{ fontSize: 12 }}
						/>
						<Bar dataKey="수입" fill="var(--income)" radius={[4, 4, 0, 0]} maxBarSize={24} animationDuration={800} />
						<Bar dataKey="지출" fill="var(--expense)" radius={[4, 4, 0, 0]} maxBarSize={24} animationDuration={800} />
					</BarChart>
				</ResponsiveContainer>
			</div>
			<dl className="sr-only">
				{summaryRows.map((row) => (
					<Fragment key={row.monthLabel}>
						<dt>{row.monthLabel}</dt>
						<dd>수입 {formatCurrency(row.income)}</dd>
						<dd>지출 {formatCurrency(row.expense)}</dd>
					</Fragment>
				))}
			</dl>
		</div>
	);
}
