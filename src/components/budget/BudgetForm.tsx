"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2, Trash2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { upsertBudget, deleteBudget } from "@/server/actions/budget";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import type { BudgetWithSpent } from "@/server/actions/budget";
import type { Category } from "@/types";

interface BudgetFormProps {
	month: string;
	budgets: BudgetWithSpent[];
	categories: Category[];
}

export function BudgetForm({ month, budgets, categories }: BudgetFormProps) {
	const [isPending, startTransition] = useTransition();
	const { showSpinner, startLoading, stopLoading } = useDeferredLoading(200);

	// 추가 Dialog
	const [addOpen, setAddOpen] = useState(false);
	const [categoryId, setCategoryId] = useState<string>("__total__");
	const [amount, setAmount] = useState("");

	// 수정 Dialog
	const [editOpen, setEditOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<BudgetWithSpent | null>(null);
	const [editAmount, setEditAmount] = useState("");

	const expenseCategories = categories.filter((c) => c.type === "expense");

	// 이미 예산이 설정된 카테고리 제외 (추가용)
	const existingCategoryIds = new Set(budgets.map((b) => b.categoryId ?? "__total__"));

	const handleSave = () => {
		const numAmount = Number(amount);
		if (!numAmount || numAmount <= 0) return;

		startTransition(async () => {
			startLoading();
			try {
				const result = await upsertBudget({
					categoryId: categoryId === "__total__" ? null : categoryId,
					amount: numAmount,
					month,
				});
				if (result.success) {
					setAddOpen(false);
					setAmount("");
					setCategoryId("__total__");
				}
			} finally {
				stopLoading();
			}
		});
	};

	const handleEditOpen = (budget: BudgetWithSpent) => {
		setEditTarget(budget);
		setEditAmount(String(budget.amount));
		setEditOpen(true);
	};

	const handleEditSave = () => {
		if (!editTarget) return;
		const numAmount = Number(editAmount);
		if (!numAmount || numAmount <= 0) return;

		startTransition(async () => {
			startLoading();
			try {
				const result = await upsertBudget({
					categoryId: editTarget.categoryId,
					amount: numAmount,
					month,
				});
				if (result.success) {
					setEditOpen(false);
					setEditTarget(null);
					setEditAmount("");
				}
			} finally {
				stopLoading();
			}
		});
	};

	const handleDelete = (budgetId: string) => {
		startTransition(async () => {
			startLoading();
			try {
				await deleteBudget(budgetId);
			} finally {
				stopLoading();
			}
		});
	};

	return (
		<div className="px-4">
			<div className="mb-3 flex items-center justify-between">
				<h3 className="text-sm font-semibold">예산 관리</h3>
				<Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
					<Plus className="mr-1 h-3.5 w-3.5" />
					예산 추가
				</Button>
			</div>

			{budgets.length > 0 && (
				<div className="space-y-1">
					{budgets.map((b) => (
						<div key={b.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
							<div className="flex items-center gap-2 text-sm">
								<span>{b.categoryIcon}</span>
								<span>{b.categoryName}</span>
							</div>
							<div className="flex items-center gap-1.5">
								<span className="text-sm font-medium">{Number(b.amount).toLocaleString()}원</span>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7"
									onClick={() => handleEditOpen(b)}
									disabled={isPending}
								>
									<Pencil className="h-3.5 w-3.5" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7"
									onClick={() => handleDelete(b.id)}
									disabled={isPending}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* 예산 추가 Dialog */}
			<Dialog open={addOpen} onOpenChange={setAddOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>예산 추가</DialogTitle>
						<DialogDescription>월 예산을 새로 등록할 카테고리와 금액을 입력합니다.</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label>카테고리</Label>
							<select
								value={categoryId}
								onChange={(e) => setCategoryId(e.target.value)}
								className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								{!existingCategoryIds.has("__total__") && (
									<option value="__total__">💰 전체 예산</option>
								)}
								{expenseCategories
									.filter((c) => !existingCategoryIds.has(c.id))
									.map((c) => (
										<option key={c.id} value={c.id}>
											{c.icon} {c.name}
										</option>
									))}
							</select>
						</div>
						<div>
							<Label>금액</Label>
							<Input
								type="number"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								placeholder="500000"
								className="mt-1"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setAddOpen(false)}>
							취소
						</Button>
						<Button onClick={handleSave} disabled={isPending || !amount}>
							{showSpinner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
							저장
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 예산 수정 Dialog */}
			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>예산 수정</DialogTitle>
						<DialogDescription>선택한 예산 항목의 금액을 수정합니다.</DialogDescription>
					</DialogHeader>
					{editTarget && (
						<div className="space-y-4">
							<div>
								<Label>카테고리</Label>
								<div className="mt-1 flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
									<span>{editTarget.categoryIcon}</span>
									<span>{editTarget.categoryName}</span>
								</div>
							</div>
							<div>
								<Label>금액</Label>
								<Input
									type="number"
									value={editAmount}
									onChange={(e) => setEditAmount(e.target.value)}
									placeholder="500000"
									className="mt-1"
									autoFocus
								/>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditOpen(false)}>
							취소
						</Button>
						<Button onClick={handleEditSave} disabled={isPending || !editAmount}>
							{showSpinner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
							수정
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
