// 파일 역할:
// - App Router 페이지 엔트리 파일이다.
// 사용 위치:
// - App Router가 `/budget` 경로를 렌더링할 때 직접 사용한다;
// 흐름:
// - 라우트 진입점에서 필요한 데이터 조회와 화면 조합을 맡고, 세부 상호작용은 하위 컴포넌트로 위임한다;
import { Suspense } from "react";

import { getBudgetsWithSpent } from "@/server/actions/budget";
import { getUserCategories } from "@/server/actions/transaction";
import { getCurrentMonth } from "@/lib/format";
import { MonthNavigator } from "@/components/dashboard/MonthNavigator";
import { BudgetProgressList } from "@/components/budget/BudgetProgressList";
import { BudgetForm } from "@/components/budget/BudgetForm";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
	searchParams: Promise<{ month?: string }>;
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

export default async function BudgetPage({ searchParams }: Props) {
	const params = await searchParams;
	const month = params.month ?? getCurrentMonth();

	// 예산 진행률과 생성 폼이 같은 월/카테고리 기준을 보도록
	// 서버에서 먼저 한 스냅샷으로 묶어 내려준다.
	const [budgets, categories] = await Promise.all([
		getBudgetsWithSpent(month),
		getUserCategories(),
	]);

	return (
		<div className="pb-28 md:pb-24">
			<h1 className="sr-only">예산</h1>
			<Suspense fallback={<MonthNavigatorFallback />}>
				<MonthNavigator month={month} />
			</Suspense>
			<BudgetProgressList budgets={budgets} />
			<Separator className="my-3" />
			<BudgetForm month={month} budgets={budgets} categories={categories} />
		</div>
	);
}
