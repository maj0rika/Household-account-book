import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function Loading() {
	return (
		<div className="pb-28 md:pb-24">
			{/* NetWorthCard */}
			<div className="space-y-3 px-4 py-4">
				<Skeleton className="h-5 w-20" />
				<Skeleton className="h-8 w-48" />
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-1">
						<Skeleton className="h-3 w-12" />
						<Skeleton className="h-5 w-28" />
					</div>
					<div className="space-y-1">
						<Skeleton className="h-3 w-12" />
						<Skeleton className="h-5 w-28" />
					</div>
				</div>
			</div>

			<Separator className="my-2" />

			{/* AccountList */}
			<div className="space-y-2 px-4 py-2">
				<div className="flex items-center justify-between">
					<Skeleton className="h-5 w-16" />
					<Skeleton className="h-8 w-8 rounded-md" />
				</div>
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-4">
						<Skeleton className="h-10 w-10 rounded-full" />
						<div className="flex-1 space-y-1.5">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-3 w-16" />
						</div>
						<Skeleton className="h-5 w-20" />
					</div>
				))}
			</div>

			<Separator className="my-2" />

			<div className="space-y-2 px-4 py-2">
				<div className="flex items-center justify-between">
					<Skeleton className="h-5 w-16" />
					<Skeleton className="h-8 w-8 rounded-md" />
				</div>
				{Array.from({ length: 2 }).map((_, i) => (
					<div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-4">
						<Skeleton className="h-10 w-10 rounded-full" />
						<div className="flex-1 space-y-1.5">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-3 w-16" />
						</div>
						<Skeleton className="h-5 w-20" />
					</div>
				))}
			</div>
		</div>
	);
}
