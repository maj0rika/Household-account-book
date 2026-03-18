// 파일 역할:
// - 거래 홈 화면의 서버 엔트리이자 월별 데이터 조합 오케스트레이터 파일이다.
// 사용 위치:
// - App Router가 `/transactions` 경로를 렌더링할 때 직접 사용한다;
// 흐름:
// - 라우트 진입 -> 월 파라미터 확정 -> 고정 거래 자동 적용 예약 -> 월 네비게이터/요약/캘린더/인사이트를 각 Suspense 경계로 분리 렌더링 -> 하위 클라이언트 컴포넌트가 상호작용을 이어받는 구조다;
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { Transaction } from "@/types";

interface Props {
	searchParams: Promise<{ month?: string }>;
}

// `TransactionsInsightsSection`이 주간 차트 범위를 만들 때 호출한다.
// 현재 월이면 "오늘까지 최근 7일", 과거 월이면 "그 달의 마지막 7일"을 계산해 차트 기준을 일정하게 맞춘다.
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

function groupTransactionsByDateMap(transactions: Transaction[]): Record<string, Transaction[]> {
	// 달력과 주간 차트는 "날짜 -> 그날의 거래들" 형태를 공통으로 사용한다.
	// 서버에서 한 번만 날짜 맵을 만들고 내려주면 각 클라이언트 컴포넌트가 월 전체 배열을 다시 순회하지 않아도 된다.
	const grouped: Record<string, Transaction[]> = {};

	for (const transaction of transactions) {
		if (!grouped[transaction.date]) {
			grouped[transaction.date] = [];
		}
		grouped[transaction.date].push(transaction);
	}

	return grouped;
}

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

// `/transactions`의 요약 카드 전용 서버 섹션이다.
// 상단 요약은 가장 먼저 읽히는 정보라 독립 Suspense로 분리해 다른 섹션 지연과 분리한다.
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
	// 캘린더 셀 클릭 이후 열리는 시트는 날짜별 거래 배열이 바로 필요하므로
	// 이 섹션에서 날짜 맵을 함께 만든 뒤 InteractiveCalendar에 전달한다.
	const transactionsByDate = groupTransactionsByDateMap(transactions);

	return (
		<>
			<Separator className="my-2" />
			<InteractiveCalendar
				month={month}
				calendarData={calendarData}
				transactionsByDate={transactionsByDate}
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
	const transactionsByDate = groupTransactionsByDateMap(transactions);
	// 주간 차트는 실제로 7일 구간 데이터만 있으면 되므로,
	// 월 전체 날짜 맵 중 필요한 키만 다시 잘라 `weekTransactionsByDate`로 넘겨 하위 의존 범위를 줄인다.
	const weekTransactionsByDate = Object.fromEntries(
		weekDates.map((date) => [date, transactionsByDate[date] ?? []]),
	);

	return (
		<TransactionsLazySections
			dailyExpenses={dailyExpenses}
			weekDates={weekDates}
			categoryBreakdown={categoryBreakdown}
			month={month}
			transactions={transactions}
			weekTransactionsByDate={weekTransactionsByDate}
			categories={categories}
			accounts={accounts}
		/>
	);
}

export default async function TransactionsPage({ searchParams }: Props) {
	const params = await searchParams;
	const rawMonth = params.month ?? getCurrentMonth();
	// 잘못된 month 쿼리가 들어와도 거래 화면은 항상 유효한 월 하나로 수렴시킨다.
	const month = isValidMonth(rawMonth) ? rawMonth : getCurrentMonth();

	// 고정 거래 자동 적용 — fire-and-forget (페이지 로드를 블로킹하지 않음)
	autoApplyRecurringTransactions().catch(() => {});

	return (
		<div className="pb-28 md:pb-24">
			<h1 className="sr-only">거래 내역</h1>
			{/* 거래 페이지는 "월 선택 → 요약 → 캘린더 → 상세 인사이트" 순서로 쌓는다.
				각 섹션을 분리된 Suspense 경계로 감싸 일부 데이터가 느려도 상단 컨텍스트부터 먼저 읽을 수 있게 한다. */}
			<Suspense fallback={<MonthNavigatorFallback />}>
				<MonthNavigator month={month} />
			</Suspense>

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
