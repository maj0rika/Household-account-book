import { Suspense } from "react";

import { getTransactions, getMonthlySummary } from "@/server/actions/transaction";
import { getCurrentMonth } from "@/lib/format";
import { MonthlySummaryCard } from "@/components/dashboard/MonthlySummaryCard";
import { TransactionList } from "@/components/transaction/TransactionList";
import { TransactionInputSection } from "@/components/transaction/TransactionInputSection";

export default async function TransactionsPage() {
	const month = getCurrentMonth();
	const [transactions, summary] = await Promise.all([
		getTransactions(month),
		getMonthlySummary(month),
	]);

	return (
		<>
			<MonthlySummaryCard summary={summary} month={month} />
			<TransactionList transactions={transactions} />
			<Suspense>
				<TransactionInputSection />
			</Suspense>
		</>
	);
}
