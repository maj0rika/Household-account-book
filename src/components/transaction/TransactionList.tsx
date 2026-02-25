"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatSignedCurrency } from "@/lib/format";
import { groupTransactionsByDate } from "@/lib/format";
import { deleteTransaction } from "@/server/actions/transaction";
import type { Transaction } from "@/types";

function TransactionItem({ tx }: { tx: Transaction }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const handleDelete = () => {
		startTransition(async () => {
			const result = await deleteTransaction(tx.id);
			if (result.success) {
				router.refresh();
			}
		});
	};

	return (
		<div className="flex items-center gap-3 px-4 py-2.5">
			<span className="text-xl">{tx.category?.icon ?? "💳"}</span>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate">{tx.description}</p>
				<p className="text-xs text-muted-foreground">
					{tx.category?.name ?? "미분류"}
				</p>
			</div>
			<span
				className={`text-sm font-semibold whitespace-nowrap ${
					tx.type === "income" ? "text-blue-600" : "text-foreground"
				}`}
			>
				{formatSignedCurrency(tx.amount, tx.type)}
			</span>
			<Button
				variant="ghost"
				size="icon"
				className="h-8 w-8 text-muted-foreground hover:text-destructive"
				onClick={handleDelete}
				disabled={isPending}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
		</div>
	);
}

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
	if (transactions.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
				<p className="text-sm">거래 내역이 없습니다</p>
				<p className="text-xs mt-1">아래 입력바에 자연어로 입력해 보세요</p>
			</div>
		);
	}

	const groups = groupTransactionsByDate(transactions);

	return (
		<div className="mt-2">
			{groups.map((group) => (
				<div key={group.date}>
					<div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm px-4 py-2">
						<span className="text-xs font-medium text-muted-foreground">{group.label}</span>
					</div>
					{group.transactions.map((tx) => (
						<TransactionItem key={tx.id} tx={tx} />
					))}
					<Separator />
				</div>
			))}
		</div>
	);
}
