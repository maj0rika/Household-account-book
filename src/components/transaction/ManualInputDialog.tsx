"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { createSingleTransaction, getUserCategories } from "@/server/actions/transaction";
import { getAccounts } from "@/server/actions/account";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/format";
import type { Category, Account } from "@/types";

interface ManualInputDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

// 계좌 미선택을 표현하는 센티넬 값
const NO_ACCOUNT = "__none__";

export function ManualInputDialog({ open, onOpenChange }: ManualInputDialogProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [categories, setCategories] = useState<Category[]>([]);
	const [accountList, setAccountList] = useState<Account[]>([]);

	const today = new Date().toISOString().split("T")[0];
	const [type, setType] = useState<"expense" | "income">("expense");
	const [categoryId, setCategoryId] = useState("");
	const [accountId, setAccountId] = useState(NO_ACCOUNT);
	const [description, setDescription] = useState("");
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState(today);

	useEffect(() => {
		if (open) {
			Promise.all([getUserCategories(), getAccounts()]).then(([cats, accs]) => {
				setCategories(cats as Category[]);
				setAccountList(accs);
			});
		}
	}, [open]);

	const filteredCategories = categories.filter((c) => c.type === type);
	const assetAccounts = accountList.filter((a) => a.type === "asset");
	const debtAccounts = accountList.filter((a) => a.type === "debt");

	const resetForm = () => {
		setType("expense");
		setCategoryId("");
		setAccountId(NO_ACCOUNT);
		setDescription("");
		setAmount("");
		setDate(today);
	};

	const handleSave = () => {
		const numAmount = Number(amount);
		if (!description.trim() || !amount || numAmount <= 0) return;

		startTransition(async () => {
			const result = await createSingleTransaction({
				type,
				categoryId: categoryId || null,
				accountId: accountId === NO_ACCOUNT ? null : accountId,
				description: description.trim(),
				amount: numAmount,
				date,
			});
			if (result.success) {
				onOpenChange(false);
				resetForm();
				router.refresh();
			}
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90dvh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>직접 입력</DialogTitle>
					<DialogDescription>거래 정보를 수동으로 입력합니다.</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-2">
					{/* 유형 선택 */}
					<div className="grid gap-2">
						<Label>유형</Label>
						<div className="flex gap-2">
							<Button
								type="button"
								variant={type === "expense" ? "default" : "outline"}
								size="sm"
								onClick={() => {
									setType("expense");
									setCategoryId("");
								}}
							>
								지출
							</Button>
							<Button
								type="button"
								variant={type === "income" ? "default" : "outline"}
								size="sm"
								onClick={() => {
									setType("income");
									setCategoryId("");
								}}
							>
								수입
							</Button>
						</div>
					</div>

					{/* 날짜 */}
					<div className="grid gap-2">
						<Label htmlFor="manual-date">날짜</Label>
						<Input
							id="manual-date"
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
						/>
					</div>

					{/* 카테고리 */}
					<div className="grid gap-2">
						<Label htmlFor="manual-category">카테고리</Label>
						<select
							id="manual-category"
							value={categoryId}
							onChange={(e) => setCategoryId(e.target.value)}
							className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
						>
							<option value="">선택 없음</option>
							{filteredCategories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{cat.icon} {cat.name}
								</option>
							))}
						</select>
					</div>

					{/* 설명 */}
					<div className="grid gap-2">
						<Label htmlFor="manual-desc">설명</Label>
						<Input
							id="manual-desc"
							placeholder="김치찌개, 택시비 등"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>

					{/* 금액 */}
					<div className="grid gap-2">
						<Label htmlFor="manual-amount">금액 (원)</Label>
						<Input
							id="manual-amount"
							type="text"
							inputMode="numeric"
							placeholder="9,000"
							value={formatCurrencyInput(amount)}
							onChange={(e) => setAmount(parseCurrencyInput(e.target.value))}
						/>
					</div>

					{/* 계좌 */}
					{accountList.length > 0 && (
						<div className="grid gap-2">
							<Label>계좌 (선택사항)</Label>
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

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						취소
					</Button>
					<Button
						onClick={handleSave}
						disabled={!description.trim() || !amount || Number(amount) <= 0 || isPending}
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								저장 중...
							</>
						) : (
							"저장"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
