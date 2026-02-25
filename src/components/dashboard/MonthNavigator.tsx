"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonth, getCurrentMonth } from "@/lib/format";

export function MonthNavigator({ month }: { month: string }) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const currentMonth = getCurrentMonth();
	const isCurrentMonth = month === currentMonth;

	const navigate = (direction: -1 | 1) => {
		const [year, m] = month.split("-").map(Number);
		let newYear = year;
		let newMonth = m + direction;
		if (newMonth < 1) {
			newMonth = 12;
			newYear--;
		} else if (newMonth > 12) {
			newMonth = 1;
			newYear++;
		}
		const newMonthStr = `${newYear}-${String(newMonth).padStart(2, "0")}`;
		const params = new URLSearchParams(searchParams.toString());
		if (newMonthStr === currentMonth) {
			params.delete("month");
		} else {
			params.set("month", newMonthStr);
		}
		const query = params.toString();
		router.push(query ? `?${query}` : "?");
	};

	return (
		<div className="flex items-center justify-center gap-2 py-3">
			<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
				<ChevronLeft className="h-4 w-4" />
			</Button>
			<span className="min-w-[120px] text-center text-sm font-semibold">
				{formatMonth(month)}
			</span>
			<Button
				variant="ghost"
				size="icon"
				className="h-8 w-8"
				onClick={() => navigate(1)}
				disabled={isCurrentMonth}
			>
				<ChevronRight className="h-4 w-4" />
			</Button>
		</div>
	);
}
