"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMonth, getCurrentMonth } from "@/lib/format";

export function MonthNavigator({ month }: { month: string }) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const [jumpOpen, setJumpOpen] = useState(false);
	const [jumpMonth, setJumpMonth] = useState(month);

	const currentMonth = getCurrentMonth();
	const isCurrentMonth = month === currentMonth;

	const currentMonthLabel = useMemo(() => formatMonth(month), [month]);

	const pushWithMonth = (targetMonth: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (targetMonth === currentMonth) {
			params.delete("month");
		} else {
			params.set("month", targetMonth);
		}
		// 월 전환 시 주간 선택 필터는 초기화 (범위 불일치 방지)
		params.delete("focusDate");
		const query = params.toString();
		router.push(query ? `?${query}` : "?");
	};

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
		startTransition(() => {
			pushWithMonth(newMonthStr);
		});
	};

	const handleOpenJump = () => {
		setJumpMonth(month);
		setJumpOpen(true);
	};

	const handleJumpApply = () => {
		if (!jumpMonth) return;
		startTransition(() => {
			pushWithMonth(jumpMonth);
			setJumpOpen(false);
		});
	};

	return (
		<>
			<div className="flex flex-col items-center justify-center gap-1 py-3">
				<div className="flex items-center justify-center gap-2">
					<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)} disabled={isPending}>
						<ChevronLeft className="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						className="min-w-[148px] gap-2 px-3"
						onClick={handleOpenJump}
						disabled={isPending}
					>
						<span className="text-sm font-semibold">{currentMonthLabel}</span>
						{isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
					</Button>

					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={() => navigate(1)}
						disabled={isCurrentMonth || isPending}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
				{isPending && (
					<p className="text-[11px] text-muted-foreground">월 데이터를 불러오는 중...</p>
				)}
			</div>

			<Dialog open={jumpOpen} onOpenChange={setJumpOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>월 바로 이동</DialogTitle>
						<DialogDescription>원하는 월로 바로 이동합니다.</DialogDescription>
					</DialogHeader>
					<div className="space-y-2 py-2">
						<Label htmlFor="jump-month">이동할 월</Label>
						<Input
							id="jump-month"
							type="month"
							value={jumpMonth}
							max={currentMonth}
							onChange={(e) => setJumpMonth(e.target.value)}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setJumpOpen(false)} disabled={isPending}>취소</Button>
						<Button onClick={handleJumpApply} disabled={!jumpMonth || isPending}>
							{isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
							이동
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
