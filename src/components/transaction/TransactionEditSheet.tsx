"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerFooter,
} from "@/components/ui/drawer";
import { updateTransaction, deleteTransaction } from "@/server/actions/transaction";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/format";
import type { Transaction, Category, Account } from "@/types";

interface TransactionEditSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	transaction: Transaction;
	categories: Category[];
	accounts: Account[];
}

// 계좌 미선택을 표현하는 센티넬 값
const NO_ACCOUNT = "__none__";

export function TransactionEditSheet({ open, onOpenChange, transaction: tx, categories, accounts }: TransactionEditSheetProps) {
	const [isPending, startTransition] = useTransition();

	const [type, setType] = useState(tx.type);
	const [categoryId, setCategoryId] = useState(tx.categoryId ?? "");
	const [accountId, setAccountId] = useState(tx.accountId ?? NO_ACCOUNT);
	const [description, setDescription] = useState(tx.description);
	const [amount, setAmount] = useState(String(tx.amount));
	const [date, setDate] = useState(tx.date);

	const filteredCategories = categories.filter((c) => c.type === type);
	const assetAccounts = accounts.filter((a) => a.type === "asset");
	const debtAccounts = accounts.filter((a) => a.type === "debt");

	const handleSave = () => {
		const numAmount = Number(amount);
		if (!numAmount || numAmount <= 0 || !description.trim()) return;

		startTransition(async () => {
			const result = await updateTransaction(tx.id, {
				type,
				categoryId: categoryId || null,
				accountId: accountId === NO_ACCOUNT ? null : accountId,
				description: description.trim(),
				amount: numAmount,
				date,
			});
			if (result.success) {
				onOpenChange(false);
			}
		});
	};

	const handleDelete = () => {
		startTransition(async () => {
			const result = await deleteTransaction(tx.id);
			if (result.success) {
				onOpenChange(false);
			}
		});
	};

	// 유형 변경 시 카테고리 리셋
	const handleTypeChange = (newType: "income" | "expense") => {
		setType(newType);
		const firstCat = categories.find((c) => c.type === newType);
		setCategoryId(firstCat?.id ?? "");
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>거래 수정</DrawerTitle>
				</DrawerHeader>

				<div className="space-y-4 px-4">
					{/* 설명 */}
					<div className="space-y-1.5">
						<Label className="text-xs">설명</Label>
						<Input
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className="h-9"
						/>
					</div>

					{/* 금액 + 날짜 */}
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label className="text-xs">금액</Label>
							<Input
								type="text"
								inputMode="numeric"
								value={formatCurrencyInput(amount)}
								onChange={(e) => setAmount(parseCurrencyInput(e.target.value))}
								className="h-9"
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">날짜</Label>
							<Input
								type="date"
								value={date}
								onChange={(e) => setDate(e.target.value)}
								className="h-9"
							/>
						</div>
					</div>

					{/* 유형 + 카테고리 */}
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label className="text-xs">유형</Label>
							<Select value={type} onValueChange={(v) => handleTypeChange(v as "income" | "expense")}>
								<SelectTrigger className="h-9">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="expense">지출</SelectItem>
									<SelectItem value="income">수입</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">카테고리</Label>
							<Select value={categoryId} onValueChange={setCategoryId}>
								<SelectTrigger className="h-9">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{filteredCategories.map((cat) => (
										<SelectItem key={cat.id} value={cat.id}>
											{cat.icon} {cat.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* 계좌 */}
					{accounts.length > 0 && (
						<div className="space-y-1.5">
							<Label className="text-xs">계좌 (선택사항)</Label>
							<Select value={accountId} onValueChange={setAccountId}>
								<SelectTrigger className="h-9">
									<SelectValue placeholder="계좌 선택" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={NO_ACCOUNT}>선택 안 함</SelectItem>
									{assetAccounts.length > 0 && (
										<SelectGroup>
											<SelectLabel>자산</SelectLabel>
											{assetAccounts.map((acc) => (
												<SelectItem key={acc.id} value={acc.id}>
													{acc.icon} {acc.name}
												</SelectItem>
											))}
										</SelectGroup>
									)}
									{debtAccounts.length > 0 && (
										<SelectGroup>
											<SelectLabel>부채</SelectLabel>
											{debtAccounts.map((acc) => (
												<SelectItem key={acc.id} value={acc.id}>
													{acc.icon} {acc.name}
												</SelectItem>
											))}
										</SelectGroup>
									)}
								</SelectContent>
							</Select>
						</div>
					)}
				</div>

				<DrawerFooter>
					<div className="flex gap-2">
						<Button
							variant="outline"
							className="text-destructive hover:bg-destructive/10"
							onClick={handleDelete}
							disabled={isPending}
						>
							<Trash2 className="mr-1.5 h-4 w-4" />
							삭제
						</Button>
						<Button className="flex-1" onClick={handleSave} disabled={isPending}>
							{isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							수정 완료
						</Button>
					</div>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
