import { Skeleton } from "@/components/ui/skeleton";

// route-level loading: 최소한의 네비게이터 스켈레톤만 표시
// 섹션별 로딩은 page.tsx 내 개별 Suspense fallback이 담당
export default function Loading() {
	return (
		<div className="pb-28 md:pb-24">
			{/* MonthNavigator 스켈레톤 */}
			<div className="flex flex-col items-center justify-center gap-1 py-3">
				<div className="flex items-center justify-center gap-2">
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-8 w-[148px] rounded-md" />
					<Skeleton className="h-8 w-8 rounded-md" />
				</div>
			</div>
		</div>
	);
}
