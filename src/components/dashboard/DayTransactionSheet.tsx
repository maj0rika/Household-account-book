"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerDescription,
} from "@/components/ui/drawer";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { TransactionItemContent } from "@/components/transaction/TransactionItemContent";
import { TransactionEditSheet } from "@/components/transaction/TransactionEditSheet";
import type { Transaction, Category } from "@/types";

interface DayTransactionSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	date: string; // YYYY-MM-DD
	transactions: Transaction[];
	categories: Category[];
}

const itemVariants = {
	hidden: { opacity: 0, y: 8 },
	visible: (i: number) => ({
		opacity: 1,
		y: 0,
		transition: { delay: i * 0.05, duration: 0.25, ease: "easeOut" as const },
	}),
};

export function DayTransactionSheet({ open, onOpenChange, date, transactions, categories }: DayTransactionSheetProps) {
	const [editingTx, setEditingTx] = useState<Transaction | null>(null);

	const dayLabel = formatRelativeDate(date);
	const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
	const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);

	return (
		<>
			<Drawer open={open} onOpenChange={onOpenChange}>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>{dayLabel}</DrawerTitle>
						<DrawerDescription>
							{transactions.length === 0 ? (
								"이 날의 거래가 없습니다."
							) : (
								<span className="flex items-center gap-3">
									<span>{transactions.length}건</span>
									{totalExpense > 0 && (
										<span className="text-expense">지출 {formatCurrency(totalExpense)}</span>
									)}
									{totalIncome > 0 && (
										<span className="text-income">수입 {formatCurrency(totalIncome)}</span>
									)}
								</span>
							)}
						</DrawerDescription>
					</DrawerHeader>

					<div className="max-h-[50vh] overflow-y-auto">
						{transactions.length === 0 ? (
							<div className="flex flex-col items-center py-10 text-muted-foreground">
								<p className="text-sm">거래 내역이 없습니다</p>
								<p className="mt-1 text-xs">입력바에서 거래를 추가해보세요</p>
							</div>
						) : (
							<AnimatePresence>
								{transactions.map((tx, index) => (
									<motion.button
										key={tx.id}
										type="button"
										custom={index}
										variants={itemVariants}
										initial="hidden"
										animate="visible"
										className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/30 active:bg-accent/50"
										onClick={() => setEditingTx(tx)}
									>
										<TransactionItemContent tx={tx} />
									</motion.button>
								))}
							</AnimatePresence>
						)}
					</div>
				</DrawerContent>
			</Drawer>

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
