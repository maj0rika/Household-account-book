"use client";

import { memo } from "react";
import { Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatSignedCurrency } from "@/lib/format";
import { getSettlementSourceLabel } from "@/lib/settlement";
import type { Transaction, SettlementSummary } from "@/types";

interface TransactionItemContentProps {
	tx: Transaction;
	settlement?: SettlementSummary | null;
}

export const TransactionItemContent = memo(function TransactionItemContent({
	tx,
	settlement = null,
}: TransactionItemContentProps) {
	const settlementLabel = settlement
		? settlement.status === "completed"
			? "정산 완료"
			: settlement.role === "organizer"
				? `미수 ${formatCurrency(settlement.outstandingAmount)}`
				: `보낼 돈 ${formatCurrency(settlement.outstandingAmount)}`
		: null;
	const settlementSourceLabel = settlement
		? getSettlementSourceLabel({
			sourceType: settlement.sourceType,
			sourceService: settlement.sourceService,
		})
		: null;

	return (
		<>
			<span className="text-xl">{tx.category?.icon ?? "💳"}</span>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<p className="truncate text-sm font-medium">{tx.description}</p>
					{settlement && (
						<Badge
							variant="outline"
							className="shrink-0 px-1.5 py-0 text-[10px]"
							aria-label="정산 연결 거래"
						>
							{settlementSourceLabel ?? "정산"}
						</Badge>
					)}
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
					{settlementLabel && ` · ${settlementLabel}`}
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
