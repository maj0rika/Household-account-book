import { Suspense, cache } from "react";

import {
	getTransactions,
	getMonthlySummary,
	getCategoryBreakdown,
	getDailyExpenses,
	getMonthlyCalendarData,
	getUserCategories,
} from "@/server/actions/transaction";
import { getAccounts } from "@/server/actions/account";
import { autoApplyRecurringTransactions } from "@/server/actions/recurring";
import { getCurrentMonth, isValidMonth, formatDateLocal, getKSTDate } from "@/lib/format";
import { MonthlySummaryCard } from "@/components/dashboard/MonthlySummaryCard";
import { MonthNavigator } from "@/components/dashboard/MonthNavigator";
import { InteractiveCalendar } from "@/components/dashboard/InteractiveCalendar";
import { TransactionsLazySections } from "@/components/dashboard/TransactionsLazySections";
import { PostActionBanner } from "@/components/common/PostActionBanner";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
	searchParams: Promise<{ month?: string; saved?: string; focus?: string }>;
}

function getWeeklyRangeByMonth(month: string): { weekDates: string[]; startDate: string; endDateExclusive: string } {
	const [year, monthNum] = month.split("-").map(Number);
	const monthStart = new Date(year, monthNum - 1, 1);
	const monthEnd = new Date(year, monthNum, 0);

	const today = getKSTDate();
	today.setHours(0, 0, 0, 0);

	const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === monthNum;
	const rangeEnd = isCurrentMonth ? today : monthEnd;

	const rangeStart = new Date(rangeEnd);
	rangeStart.setDate(rangeEnd.getDate() - 6);
	if (rangeStart < monthStart) {
		rangeStart.setTime(monthStart.getTime());
	}

	const weekDates: string[] = [];
	const cursor = new Date(rangeStart);
	while (cursor <= rangeEnd) {
		weekDates.push(formatDateLocal(cursor));
		cursor.setDate(cursor.getDate() + 1);
	}

	const endExclusive = new Date(rangeEnd);
	endExclusive.setDate(endExclusive.getDate() + 1);

	return {
		weekDates,
		startDate: formatDateLocal(rangeStart),
		endDateExclusive: formatDateLocal(endExclusive),
	};
}

// 같은 요청 안에서 여러 섹션이 동일 데이터를 참조하므로
// React cache로 중복 조회를 줄이고 Suspense 경계가 나뉘어도 결과를 공유한다.
const getTransactionsCached = cache(async (month: string) => getTransactions(month));
const getUserCategoriesCached = cache(async () => getUserCategories());
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

function SummaryFallback() {
	return (
		<div className="space-y-2 px-4 py-2">
			<Skeleton className="h-6 w-40" />
			<Skeleton className="h-20 w-full" />
		</div>
	);
}

function CalendarFallback() {
	return (
		<>
			<Separator className="my-2" />
			<div className="space-y-2 px-4 py-2">
				<Skeleton className="h-5 w-32" />
				<Skeleton className="h-64 w-full" />
			</div>
		</>
	);
}

function InsightsFallback() {
	return (
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
	);
}

async function TransactionsSummarySection({ month }: { month: string }) {
	const summary = await getMonthlySummary(month);
	return <MonthlySummaryCard summary={summary} month={month} />;
}

async function TransactionsCalendarSection({ month }: { month: string }) {
	const [transactions, calendarData, categories] = await Promise.all([
		getTransactionsCached(month),
		getMonthlyCalendarData(month),
		getUserCategoriesCached(),
	]);

	return (
		<>
			<Separator className="my-2" />
			<InteractiveCalendar
				month={month}
				calendarData={calendarData}
				transactions={transactions}
				categories={categories}
			/>
		</>
	);
}

async function TransactionsInsightsSection({
	month,
}: {
	month: string;
}) {
	// 아래 섹션들은 같은 월 기준 데이터를 여러 카드에서 함께 쓰므로
	// 여기서 한 번 모아 내려주고, 하위 클라이언트 컴포넌트는 렌더링과 상호작용에만 집중시킨다.
	const { weekDates, startDate, endDateExclusive } = getWeeklyRangeByMonth(month);

	const [transactions, categories, accounts, categoryBreakdown, dailyExpenses] = await Promise.all([
		getTransactionsCached(month),
		getUserCategoriesCached(),
		getAccountsCached(),
		getCategoryBreakdown(month),
		getDailyExpenses(startDate, endDateExclusive),
	]);

	return (
		<TransactionsLazySections
			dailyExpenses={dailyExpenses}
			weekDates={weekDates}
			categoryBreakdown={categoryBreakdown}
			month={month}
			transactions={transactions}
			categories={categories}
			accounts={accounts}
			listSectionId="transactions-list-section"
		/>
	);
}

export default async function TransactionsPage({ searchParams }: Props) {
	const params = await searchParams;
	const rawMonth = params.month ?? getCurrentMonth();
	const month = isValidMonth(rawMonth) ? rawMonth : getCurrentMonth();

	// 고정 거래 자동 적용 — fire-and-forget (페이지 로드를 블로킹하지 않음)
	autoApplyRecurringTransactions().catch(() => {});

	const savedMessage = params.saved === "mixed"
		? "거래/자산 등록이 완료됐어요. 거래 목록으로 이동했어요."
		: params.saved === "tx"
			? "거래 저장이 완료됐어요. 최신 거래를 확인해 주세요."
			: null;

	const focusTarget = params.focus === "list" ? "transactions-list-section" : undefined;

	return (
		<div className="pb-28 md:pb-24">
			{/* 거래 페이지는 "월 선택 → 요약 → 캘린더 → 상세 인사이트" 순서로 쌓는다.
				각 섹션을 분리된 Suspense 경계로 감싸 일부 데이터가 느려도 상단 컨텍스트부터 먼저 읽을 수 있게 한다. */}
			<Suspense fallback={<MonthNavigatorFallback />}>
				<MonthNavigator month={month} />
			</Suspense>
			<PostActionBanner message={savedMessage} targetId={focusTarget} />

			<Suspense fallback={<SummaryFallback />}>
				<TransactionsSummarySection month={month} />
			</Suspense>

			<Suspense fallback={<CalendarFallback />}>
				<TransactionsCalendarSection month={month} />
			</Suspense>

			<Suspense fallback={<InsightsFallback />}>
				<TransactionsInsightsSection month={month} />
			</Suspense>
		</div>
	);
}
