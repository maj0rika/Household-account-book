"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
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
import type { Transaction, Category } from "@/types";

interface TransactionEditSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	transaction: Transaction;
	categories: Category[];
}

export function TransactionEditSheet({ open, onOpenChange, transaction: tx, categories }: TransactionEditSheetProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const [type, setType] = useState(tx.type);
	const [categoryId, setCategoryId] = useState(tx.categoryId ?? "");
	const [description, setDescription] = useState(tx.description);
	const [amount, setAmount] = useState(String(tx.amount));
	const [date, setDate] = useState(tx.date);

	const filteredCategories = categories.filter((c) => c.type === type);

	const handleSave = () => {
		const numAmount = Number(amount);
		if (!numAmount || numAmount <= 0 || !description.trim()) return;

		startTransition(async () => {
			const result = await updateTransaction(tx.id, {
				type,
				categoryId: categoryId || null,
				description: description.trim(),
				amount: numAmount,
				date,
			});
			if (result.success) {
				onOpenChange(false);
				router.refresh();
			}
		});
	};

	const handleDelete = () => {
		startTransition(async () => {
			const result = await deleteTransaction(tx.id);
			if (result.success) {
				onOpenChange(false);
				router.refresh();
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
								value={amount ? Number(amount).toLocaleString("ko-KR") : ""}
								onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
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
