import { Suspense, cache } from "react";

import { MonthNavigator } from "@/components/dashboard/MonthNavigator";
import { SettlementBoard } from "@/components/settlement/SettlementBoard";
import { SettlementDigestCard } from "@/components/settlement/SettlementDigestCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentMonth, isValidMonth } from "@/lib/format";
import { getSettlementDigest, getSettlements } from "@/server/actions/settlement";
import { getAccounts } from "@/server/actions/account";

interface Props {
	searchParams: Promise<{ month?: string; settlementId?: string }>;
}

const getSettlementDigestCached = cache(async (month: string) => getSettlementDigest(month));
const getSettlementsCached = cache(async (month: string) => getSettlements(month));
const getAccountsCached = cache(async () => getAccounts());

function MonthNavigatorFallback() {
	return (
		<div className="flex flex-col items-center justify-center gap-1 py-3">
			<div className="flex items-center justify-center gap-2">
				<Skeleton className="h-8 w-8 rounded-md" />
				<Skeleton className="h-8 w-[148px] rounded-md" />
				<Skeleton className="h-8 w-8 rounded-md" />
			</div>
		</div>
	);
}

function SettlementPageFallback() {
	return (
		<div className="space-y-3 px-4 py-4">
			<Skeleton className="h-32 w-full rounded-2xl" />
			<Skeleton className="h-10 w-64 rounded-full" />
			<Skeleton className="h-40 w-full rounded-2xl" />
			<Skeleton className="h-40 w-full rounded-2xl" />
		</div>
	);
}

async function SettlementContent({
	month,
	initialOpenSettlementId,
}: {
	month: string;
	initialOpenSettlementId?: string;
}) {
	const [digest, settlements, accounts] = await Promise.all([
		getSettlementDigestCached(month),
		getSettlementsCached(month),
		getAccountsCached(),
	]);

	return (
		<>
			<div className="px-4 pt-2">
				<h1 className="text-lg font-semibold">정산 보드</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					총무 결제의 총액은 정산에서 추적하고, 가계부는 내 부담금만 유지합니다.
				</p>
			</div>
			<SettlementDigestCard digest={digest} month={month} href={null} />
				<SettlementBoard
					initialSettlements={settlements}
					accounts={accounts}
					month={month}
					initialOpenSettlementId={initialOpenSettlementId}
				/>
		</>
	);
}

export default async function SettlementsPage({ searchParams }: Props) {
	const params = await searchParams;
	const rawMonth = params.month ?? getCurrentMonth();
	const month = isValidMonth(rawMonth) ? rawMonth : getCurrentMonth();

	return (
		<div className="pb-24 md:pb-8">
			<Suspense fallback={<MonthNavigatorFallback />}>
				<MonthNavigator month={month} />
			</Suspense>
			<Suspense fallback={<SettlementPageFallback />}>
				<SettlementContent
					month={month}
					initialOpenSettlementId={params.settlementId}
				/>
			</Suspense>
		</div>
	);
}
