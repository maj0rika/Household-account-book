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

			{/* MonthlyTrendChart */}
			<div className="space-y-2 px-4 py-2">
				<Skeleton className="h-5 w-24" />
				<div className="flex items-end justify-around gap-2" style={{ height: 160 }}>
					{[60, 80, 45, 90, 70, 55].map((h, i) => (
						<div key={i} className="flex flex-1 flex-col items-center gap-1">
							<Skeleton className="w-full rounded-t-md" style={{ height: h }} />
							<Skeleton className="h-3 w-6" />
						</div>
					))}
				</div>
			</div>

			<Separator className="my-2" />

			{/* CategoryRanking */}
			<div className="space-y-2 px-4 py-2">
				<Skeleton className="h-5 w-28" />
			</div>
			{Array.from({ length: 6 }).map((_, i) => (
				<div key={i} className="flex items-center gap-3 px-4 py-2.5">
					<Skeleton className="h-8 w-8 rounded-full" />
					<div className="flex-1 space-y-1.5">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-2 w-full rounded-full" />
					</div>
					<Skeleton className="h-4 w-14" />
				</div>
			))}
		</div>
	);
}
