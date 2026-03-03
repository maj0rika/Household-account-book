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

			{/* BudgetProgressList */}
			<div className="space-y-3 px-4 py-2">
				<Skeleton className="h-6 w-32" />
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="space-y-2 rounded-xl border bg-card p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Skeleton className="h-6 w-6 rounded-full" />
								<Skeleton className="h-4 w-20" />
							</div>
							<Skeleton className="h-4 w-24" />
						</div>
						<Skeleton className="h-2 w-full rounded-full" />
					</div>
				))}
			</div>

			<Separator className="my-3" />

			{/* BudgetForm */}
			<div className="space-y-3 px-4 py-2">
				<Skeleton className="h-5 w-24" />
				<Skeleton className="h-11 w-full rounded-md" />
				<Skeleton className="h-11 w-full rounded-md" />
				<Skeleton className="h-11 w-full rounded-md" />
			</div>
		</div>
	);
}
