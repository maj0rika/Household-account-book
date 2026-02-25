"use client";

import { Trash2, Repeat } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
		<motion.div
			layout
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, x: -60, transition: { duration: 0.2 } }}
			transition={{ duration: 0.25, ease: "easeOut" }}
			className="flex items-center gap-3 px-4 py-2.5 active:bg-accent/30"
		>
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
				<p className="text-xs text-muted-foreground">
					{tx.category?.name ?? "미분류"}
				</p>
			</div>
			<span
				className={`whitespace-nowrap text-sm font-semibold ${
					tx.type === "income" ? "text-income" : "text-foreground"
				}`}
			>
				{formatSignedCurrency(tx.amount, tx.type)}
			</span>
			<Button
				variant="ghost"
				size="icon"
				className="h-8 w-8 text-muted-foreground hover:text-destructive active:scale-90"
				onClick={handleDelete}
				disabled={isPending}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
		</motion.div>
	);
}

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
	if (transactions.length === 0) {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.2 }}
				className="flex flex-col items-center justify-center py-16 text-muted-foreground"
			>
				<p className="text-sm">거래 내역이 없습니다</p>
				<p className="mt-1 text-xs">아래 입력바에 자연어로 입력해 보세요</p>
			</motion.div>
		);
	}

	const groups = groupTransactionsByDate(transactions);

	return (
		<div className="mt-2">
			<AnimatePresence mode="popLayout">
				{groups.map((group) => (
					<div key={group.date}>
						<div className="sticky top-0 z-10 bg-background/90 px-4 py-2 backdrop-blur-sm">
							<span className="text-xs font-medium text-muted-foreground">{group.label}</span>
						</div>
						{group.transactions.map((tx) => (
							<TransactionItem key={tx.id} tx={tx} />
						))}
						<Separator />
					</div>
				))}
			</AnimatePresence>
		</div>
	);
}
