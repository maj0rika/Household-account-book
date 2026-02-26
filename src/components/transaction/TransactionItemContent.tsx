"use client";

import { memo } from "react";
import { Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatSignedCurrency } from "@/lib/format";
import type { Transaction } from "@/types";

interface TransactionItemContentProps {
	tx: Transaction;
}

export const TransactionItemContent = memo(function TransactionItemContent({ tx }: TransactionItemContentProps) {
	return (
		<>
			<span className="text-xl">{tx.category?.icon ?? "💳"}</span>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<p className="truncate text-sm font-medium">{tx.description}</p>
					{tx.isRecurring && (
						<Badge variant="outline" className="shrink-0 gap-0.5 px-1 py-0 text-[10px]">
							<Repeat className="h-2.5 w-2.5" />
							고정
						</Badge>
					)}
				</div>
				<p className="truncate text-xs text-muted-foreground">
					{tx.category?.name ?? "미분류"}
					{tx.account && ` · ${tx.account.icon}${tx.account.name}`}
				</p>
			</div>
			<span
				className={`whitespace-nowrap text-sm font-semibold ${
					tx.type === "income" ? "text-income" : "text-foreground"
				}`}
			>
				{formatSignedCurrency(tx.amount, tx.type)}
			</span>
		</>
	);
});
