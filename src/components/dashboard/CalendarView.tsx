"use client";

import { cn } from "@/lib/utils";

const DAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];

interface CalendarViewProps {
	month: string; // YYYY-MM
	data: Record<string, { income: number; expense: number }>;
}

export function CalendarView({ month, data }: CalendarViewProps) {
	const [year, m] = month.split("-").map(Number);
	const firstDay = new Date(year, m - 1, 1).getDay();
	const daysInMonth = new Date(year, m, 0).getDate();
	const today = new Date().toISOString().split("T")[0];

	const cells: (number | null)[] = [];
	for (let i = 0; i < firstDay; i++) cells.push(null);
	for (let d = 1; d <= daysInMonth; d++) cells.push(d);

	return (
		<div className="px-4 py-2">
			<h3 className="mb-3 text-sm font-semibold">달력</h3>
			<div className="grid grid-cols-7 gap-px text-center text-[10px]">
				{DAY_HEADERS.map((d, i) => (
					<div
						key={d}
						className={cn(
							"py-1 font-medium text-muted-foreground",
							i === 0 && "text-expense/70",
							i === 6 && "text-income/70",
						)}
					>
						{d}
					</div>
				))}
				{cells.map((day, i) => {
					if (day === null) return <div key={`empty-${i}`} />;

					const dateStr = `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
					const dayData = data[dateStr];
					const isToday = dateStr === today;

					return (
						<div
							key={day}
							className={cn(
								"flex flex-col items-center gap-0.5 rounded-md py-1",
								isToday && "bg-accent",
							)}
						>
							<span className={cn("text-[11px]", isToday && "font-bold")}>{day}</span>
							{dayData?.expense ? (
								<span className="text-[8px] leading-none text-expense">
									-{abbreviateAmount(dayData.expense)}
								</span>
							) : null}
							{dayData?.income ? (
								<span className="text-[8px] leading-none text-income">
									+{abbreviateAmount(dayData.income)}
								</span>
							) : null}
						</div>
					);
				})}
			</div>
		</div>
	);
}

function abbreviateAmount(amount: number): string {
	if (amount >= 10000) {
		const man = Math.floor(amount / 10000);
		const remainder = amount % 10000;
		if (remainder === 0) return `${man}만`;
		return `${man}.${Math.floor(remainder / 1000)}만`;
	}
	if (amount >= 1000) {
		return `${Math.floor(amount / 1000)}천`;
	}
	return String(amount);
}
