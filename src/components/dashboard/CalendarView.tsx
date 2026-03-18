"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { formatCurrency, getTodayString } from "@/lib/format";

const DAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];

function formatCalendarDateLabel(dateStr: string): string {
	const d = new Date(`${dateStr}T00:00:00`);
	return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatCalendarAmountLabel(value?: number): string {
	if (value === undefined) return "없음";
	return formatCurrency(value);
}

interface CalendarViewProps {
	month: string; // YYYY-MM
	data: Record<string, { income: number; expense: number }>;
	selectedDate?: string | null;
	onDateSelect?: (date: string) => void;
}

export function CalendarView({ month, data, selectedDate, onDateSelect }: CalendarViewProps) {
	const calendarId = useId();
	const [year, m] = month.split("-").map(Number);
	const firstDay = new Date(year, m - 1, 1).getDay();
	const daysInMonth = new Date(year, m, 0).getDate();
	const today = getTodayString();
	const titleId = `${calendarId}-title`;
	const descriptionId = `${calendarId}-description`;
	const dateValues = useMemo(
		() => Array.from({ length: daysInMonth }, (_, index) => {
			return `${year}-${String(m).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
		}),
		[daysInMonth, m, year],
	);
	const getInitialActiveDate = useCallback(() => {
		if (selectedDate && dateValues.includes(selectedDate)) {
			return selectedDate;
		}

		if (today.startsWith(`${month}-`) && dateValues.includes(today)) {
			return today;
		}

		return dateValues[0] ?? null;
	}, [dateValues, month, selectedDate, today]);
	const [activeDate, setActiveDate] = useState<string | null>(getInitialActiveDate);
	const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

	const cells: (string | null)[] = [];
	for (let i = 0; i < firstDay; i++) cells.push(null);
	for (const dateValue of dateValues) cells.push(dateValue);
	while (cells.length % 7 !== 0) cells.push(null);
	const rows = Array.from({ length: Math.ceil(cells.length / 7) }, (_, index) => {
		return cells.slice(index * 7, index * 7 + 7);
	});

	useEffect(() => {
		setActiveDate(getInitialActiveDate());
	}, [getInitialActiveDate]);

	const moveFocus = useCallback((currentDate: string, offset: number) => {
		const currentIndex = dateValues.indexOf(currentDate);
		if (currentIndex === -1) return;

		const nextIndex = currentIndex + offset;
		if (nextIndex < 0 || nextIndex >= dateValues.length) return;

		const nextDate = dateValues[nextIndex];
		setActiveDate(nextDate);
		buttonRefs.current[nextDate]?.focus();
	}, [dateValues]);

	const moveToWeekEdge = useCallback((currentDate: string, direction: "start" | "end") => {
		const currentIndex = dateValues.indexOf(currentDate);
		if (currentIndex === -1) return;

		const columnIndex = (firstDay + currentIndex) % 7;
		const offset = direction === "start" ? -columnIndex : 6 - columnIndex;
		moveFocus(currentDate, offset);
	}, [dateValues, firstDay, moveFocus]);

	const handleDayKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>, dateStr: string) => {
		switch (event.key) {
			case "ArrowLeft":
				event.preventDefault();
				moveFocus(dateStr, -1);
				return;
			case "ArrowRight":
				event.preventDefault();
				moveFocus(dateStr, 1);
				return;
			case "ArrowUp":
				event.preventDefault();
				moveFocus(dateStr, -7);
				return;
			case "ArrowDown":
				event.preventDefault();
				moveFocus(dateStr, 7);
				return;
			case "Home":
				event.preventDefault();
				moveToWeekEdge(dateStr, "start");
				return;
			case "End":
				event.preventDefault();
				moveToWeekEdge(dateStr, "end");
				return;
			default:
				return;
		}
	}, [moveFocus, moveToWeekEdge]);

	return (
		<div className="px-4 py-2" aria-labelledby={titleId} aria-describedby={descriptionId}>
			<h3 id={titleId} className="mb-3 text-sm font-semibold">달력</h3>
			<p id={descriptionId} className="sr-only">
				달력의 각 날짜 버튼에는 전체 날짜와 수입, 지출 요약이 포함됩니다. 화살표 키로 날짜를 이동하고 Enter 또는 Space로 선택할 수 있습니다.
			</p>
			<div role="grid" aria-labelledby={titleId} aria-describedby={descriptionId} aria-readonly="true">
				<div role="row" className="grid grid-cols-7 gap-px text-center text-[10px]">
					{DAY_HEADERS.map((d, i) => (
						<div
							key={d}
							role="columnheader"
							className={cn(
								"py-1 font-medium text-muted-foreground",
								i === 0 && "text-expense/70",
								i === 6 && "text-income/70",
							)}
						>
							{d}
						</div>
					))}
				</div>
				{rows.map((row, rowIndex) => (
					<div key={`week-${rowIndex}`} role="row" className="grid grid-cols-7 gap-px text-center text-[10px]">
						{row.map((dateStr, columnIndex) => {
							if (dateStr === null) {
								return <div key={`empty-${rowIndex}-${columnIndex}`} role="gridcell" aria-hidden="true" />;
							}

					const dayData = data[dateStr];
					const isToday = dateStr === today;
					const isSelected = dateStr === selectedDate;
							const day = Number(dateStr.slice(-2));
							const isActive = dateStr === activeDate;

							return (
								<div key={dateStr} role="gridcell" aria-selected={isSelected}>
									<button
										ref={(element) => {
											buttonRefs.current[dateStr] = element;
										}}
										type="button"
										tabIndex={isActive ? 0 : -1}
										aria-pressed={isSelected}
										aria-label={`${formatCalendarDateLabel(dateStr)}, 지출 ${formatCalendarAmountLabel(dayData?.expense)}, 수입 ${formatCalendarAmountLabel(dayData?.income)}${isToday ? ", 오늘" : ""}${isSelected ? ", 선택됨" : ""}`}
										onFocus={() => setActiveDate(dateStr)}
										onKeyDown={(event) => handleDayKeyDown(event, dateStr)}
										onClick={() => onDateSelect?.(dateStr)}
										className={cn(
											"flex w-full flex-col items-center gap-0.5 rounded-md py-1 transition-colors",
											"hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-95",
											isToday && !isSelected && "bg-accent",
											isSelected && "bg-primary/15 ring-1 ring-primary/40",
										)}
									>
										<span className={cn(
											"text-[11px]",
											isToday && "font-bold",
											isSelected && "font-bold text-primary",
										)}>
											{day}
										</span>
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
									</button>
								</div>
							);
						})}
					</div>
				))}
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
