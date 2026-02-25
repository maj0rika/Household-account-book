import { Skeleton } from "@/components/ui/skeleton";
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

			{/* BudgetProgressList */}
			<div className="space-y-3 px-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="rounded-xl border border-border bg-card p-4">
						<div className="mb-2 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Skeleton className="h-6 w-6 rounded" />
								<Skeleton className="h-4 w-20" />
							</div>
							<Skeleton className="h-3 w-10" />
						</div>
						<Skeleton className="mb-1.5 h-2.5 w-full rounded-full" />
						<div className="flex justify-between">
							<Skeleton className="h-3 w-20" />
							<Skeleton className="h-3 w-20" />
						</div>
					</div>
				))}
			</div>

			<Separator className="my-3" />

			{/* BudgetForm */}
			<div className="px-4">
				<Skeleton className="mb-3 h-5 w-24" />
				<Skeleton className="h-10 w-full rounded-lg" />
			</div>
		</div>
	);
}
