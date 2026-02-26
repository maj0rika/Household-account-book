import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
	return (
		<div className="pb-28 md:pb-24">
			<div className="flex flex-col items-center justify-center gap-1 py-3">
				<div className="flex items-center justify-center gap-2">
					<Skeleton className="h-8 w-8" />
					<Skeleton className="h-8 w-40" />
					<Skeleton className="h-8 w-8" />
				</div>
			</div>

			<div className="space-y-2 px-4 py-2">
				<Skeleton className="h-6 w-40" />
				<Skeleton className="h-20 w-full" />
			</div>

			<Separator className="my-2" />
			<div className="space-y-2 px-4 py-2">
				<Skeleton className="h-5 w-32" />
				<Skeleton className="h-64 w-full" />
			</div>

			<div className="space-y-2 px-4 py-2">
				<Separator className="my-2" />
				<Skeleton className="h-5 w-24" />
				<Skeleton className="h-28 w-full" />
				<Separator className="my-2" />
				<Skeleton className="h-5 w-28" />
				<Skeleton className="h-28 w-full" />
				<Separator className="my-2" />
				<Skeleton className="h-5 w-36" />
				<Skeleton className="h-20 w-full" />
				<Separator className="my-2" />
				<Skeleton className="h-5 w-24" />
				<Skeleton className="h-56 w-full" />
			</div>
		</div>
	);
}
