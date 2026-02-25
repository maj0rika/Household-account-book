import { Suspense } from "react";

import { getBudgetsWithSpent } from "@/server/actions/budget";
import { getUserCategories } from "@/server/actions/transaction";
import { getCurrentMonth } from "@/lib/format";
import { MonthNavigator } from "@/components/dashboard/MonthNavigator";
import { BudgetProgressList } from "@/components/budget/BudgetProgressList";
import { BudgetForm } from "@/components/budget/BudgetForm";
import { Separator } from "@/components/ui/separator";

interface Props {
	searchParams: Promise<{ month?: string }>;
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
			<Suspense>
				<MonthNavigator month={month} />
			</Suspense>
			<BudgetProgressList budgets={budgets} />
			<Separator className="my-3" />
			<BudgetForm month={month} budgets={budgets} categories={categories} />
		</div>
	);
}
