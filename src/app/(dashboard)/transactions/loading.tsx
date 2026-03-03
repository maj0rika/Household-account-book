import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function Loading() {
	return (
		<div className="pb-28 md:pb-24">
			{/* MonthNavigator */}
			<div className="flex flex-col items-center justify-center gap-1 py-3">
				<div className="flex items-center justify-center gap-2">
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-8 w-[148px] rounded-md" />
					<Skeleton className="h-8 w-8 rounded-md" />
				</div>
			</div>

			{/* MonthlySummaryCard */}
			<div className="space-y-2 px-4 py-2">
				<Skeleton className="h-6 w-40" />
				<div className="grid grid-cols-3 gap-2">
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className="rounded-xl border bg-card p-3 flex flex-col items-center gap-2">
							<Skeleton className="h-4 w-4 rounded-full" />
							<Skeleton className="h-3 w-8" />
							<Skeleton className="h-4 w-16" />
						</div>
					))}
				</div>
			</div>

			<Separator className="my-2" />

			{/* CalendarView */}
			<div className="space-y-2 px-4 py-2">
				<Skeleton className="h-5 w-32" />
				<div className="grid grid-cols-7 gap-1">
					{Array.from({ length: 7 }).map((_, i) => (
						<Skeleton key={`h-${i}`} className="mx-auto h-3 w-4" />
					))}
					{Array.from({ length: 35 }).map((_, i) => (
						<Skeleton key={i} className="mx-auto h-8 w-full rounded-md" />
					))}
				</div>
			</div>

			<Separator className="my-2" />

			{/* WeeklyBarChart */}
			<div className="space-y-2 px-4 py-2">
				<Skeleton className="h-5 w-24" />
				<div className="flex items-end justify-around gap-2" style={{ height: 120 }}>
					{[40, 65, 30, 80, 55, 45, 70].map((h, i) => (
						<div key={i} className="flex flex-1 flex-col items-center gap-1">
							<Skeleton className="w-full rounded-t-md" style={{ height: h }} />
							<Skeleton className="h-3 w-4" />
						</div>
					))}
				</div>
			</div>

			<Separator className="my-2" />

			{/* CategoryPieChart */}
			<div className="space-y-2 px-4 py-2">
				<Skeleton className="h-5 w-28" />
				<div className="flex items-center gap-4">
					<Skeleton className="h-[140px] w-[140px] shrink-0 rounded-full" />
					<div className="flex flex-1 flex-col gap-2">
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="flex items-center gap-2">
								<Skeleton className="h-2.5 w-2.5 rounded-full" />
								<Skeleton className="h-3 w-16" />
								<Skeleton className="ml-auto h-3 w-8" />
							</div>
						))}
					</div>
				</div>
			</div>

			<Separator className="my-2" />

			{/* 고정 수입/지출 */}
			<div className="space-y-2 px-4 py-2">
				<Skeleton className="h-5 w-36" />
				<Skeleton className="h-20 w-full rounded-lg" />
			</div>

			<Separator className="my-2" />

			{/* TransactionList */}
			<div className="space-y-2 px-4 py-2">
				<Skeleton className="h-5 w-24" />
			</div>
			{Array.from({ length: 5 }).map((_, i) => (
				<div key={i} className="flex items-center gap-3 px-4 py-2.5">
					<Skeleton className="h-8 w-8 rounded-full" />
					<div className="flex-1 space-y-1.5">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-3 w-16" />
					</div>
					<Skeleton className="h-4 w-16" />
				</div>
			))}
		</div>
	);
}
