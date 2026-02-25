import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Loading() {
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

			{/* MonthlyTrendChart */}
			<div className="px-4 py-2">
				<div className="rounded-xl border border-border bg-card p-4">
					<Skeleton className="mb-3 h-4 w-32" />
					<Skeleton className="h-[220px] w-full rounded-lg" />
				</div>
			</div>

			<Separator className="my-2" />

			{/* CategoryRankingList */}
			<div className="px-4 py-2">
				<div className="rounded-xl border border-border bg-card p-4">
					<Skeleton className="mb-3 h-4 w-24" />
					<div className="space-y-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="space-y-1.5">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Skeleton className="h-6 w-6 rounded" />
										<Skeleton className="h-4 w-16" />
									</div>
									<Skeleton className="h-4 w-20" />
								</div>
								<Skeleton className="h-2 w-full rounded-full" />
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
