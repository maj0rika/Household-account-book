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

	const [budgets, categories] = await Promise.all([
		getBudgetsWithSpent(month),
		getUserCategories(),
	]);

	return (
		<div className="pb-28 md:pb-24">
			<Suspense fallback={<MonthNavigatorFallback />}>
				<MonthNavigator month={month} />
			</Suspense>
			<BudgetProgressList budgets={budgets} />
			<Separator className="my-3" />
			<BudgetForm month={month} budgets={budgets} categories={categories} />
		</div>
	);
}
