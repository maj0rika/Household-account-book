"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import { Separator } from "@/components/ui/separator";
import { groupTransactionsByDate } from "@/lib/format";
import { TransactionItemContent } from "@/components/transaction/TransactionItemContent";
import { TransactionEditSheet } from "@/components/transaction/TransactionEditSheet";
import type { Transaction, Category } from "@/types";

function TransactionItem({
	tx,
	onEdit,
}: {
	tx: Transaction;
	onEdit: (tx: Transaction) => void;
}) {
	return (
		<motion.button
			type="button"
			layout
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, x: -60, transition: { duration: 0.2 } }}
			transition={{ duration: 0.25, ease: "easeOut" }}
			className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/30 active:bg-accent/50"
			onClick={() => onEdit(tx)}
		>
			<TransactionItemContent tx={tx} />
		</motion.button>
	);
}

export function TransactionList({
	transactions,
	categories,
}: {
	transactions: Transaction[];
	categories: Category[];
}) {
	const [editingTx, setEditingTx] = useState<Transaction | null>(null);

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
		<>
			<div className="mt-2">
				<AnimatePresence mode="popLayout">
					{groups.map((group) => (
						<div key={group.date}>
							<div className="sticky top-0 z-10 bg-background/90 px-4 py-2 backdrop-blur-sm">
								<span className="text-xs font-medium text-muted-foreground">{group.label}</span>
							</div>
							{group.transactions.map((tx) => (
								<TransactionItem
									key={tx.id}
									tx={tx}
									onEdit={setEditingTx}
								/>
							))}
							<Separator />
						</div>
					))}
				</AnimatePresence>
			</div>

			{editingTx && (
				<TransactionEditSheet
					open={!!editingTx}
					onOpenChange={(open) => {
						if (!open) setEditingTx(null);
					}}
					transaction={editingTx}
					categories={categories}
				/>
			)}
		</>
	);
}
