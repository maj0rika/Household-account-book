import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function DashboardSkeleton() {
	return (
		<div className="pb-28 md:pb-24">
			{/* MonthNavigator */}
			<div className="flex items-center justify-center gap-3 px-4 py-3">
				<Skeleton className="h-8 w-8 rounded-full" />
				<Skeleton className="h-6 w-28" />
				<Skeleton className="h-8 w-8 rounded-full" />
			</div>

			{/* MonthlySummaryCard */}
			<div className="px-4 pt-4">
				<Skeleton className="mb-3 h-6 w-20" />
				<div className="grid grid-cols-3 gap-2">
					{Array.from({ length: 3 }).map((_, i) => (
						<Card key={i}>
							<CardContent className="flex flex-col items-center gap-2 p-3">
								<Skeleton className="h-4 w-4 rounded-full" />
								<Skeleton className="h-3 w-8" />
								<Skeleton className="h-4 w-16" />
							</CardContent>
						</Card>
					))}
				</div>
			</div>

			<Separator className="my-2" />

			{/* CalendarView */}
			<div className="px-4 py-2">
				<Skeleton className="mb-3 h-4 w-12" />
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
			<div className="px-4 py-2">
				<Skeleton className="mb-3 h-4 w-16" />
				<div className="flex items-end justify-around gap-2" style={{ height: 120 }}>
					{Array.from({ length: 7 }).map((_, i) => (
						<div key={i} className="flex flex-1 flex-col items-center gap-1">
							<Skeleton
								className="w-full rounded-t-md"
								style={{ height: 20 + Math.random() * 60 }}
							/>
							<Skeleton className="h-3 w-4" />
						</div>
					))}
				</div>
			</div>

			<Separator className="my-2" />

			{/* CategoryPieChart */}
			<div className="px-4 py-2">
				<Skeleton className="mb-3 h-4 w-24" />
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

			{/* TransactionList */}
			<div className="mt-2">
				<div className="px-4 py-2">
					<Skeleton className="h-3 w-20" />
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
		</div>
	);
}
