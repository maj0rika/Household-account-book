"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerDescription,
	DrawerFooter,
} from "@/components/ui/drawer";
import { formatCurrency, formatSignedCurrency } from "@/lib/format";
import { createTransactions } from "@/server/actions/transaction";
import type { ParsedTransaction } from "@/server/llm/types";

interface ParseResultSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: ParsedTransaction[];
	originalInput: string;
}

export function ParseResultSheet({ open, onOpenChange, items: initialItems, originalInput }: ParseResultSheetProps) {
	const router = useRouter();
	const [items, setItems] = useState<ParsedTransaction[]>(initialItems);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		setItems(initialItems);
	}, [initialItems]);

	const handleRemove = (index: number) => {
		setItems((prev) => prev.filter((_, i) => i !== index));
	};

	const totalExpense = items
		.filter((i) => i.type === "expense")
		.reduce((sum, i) => sum + i.amount, 0);
	const totalIncome = items
		.filter((i) => i.type === "income")
		.reduce((sum, i) => sum + i.amount, 0);

	const handleSave = () => {
		if (items.length === 0) return;

		startTransition(async () => {
			const result = await createTransactions(items, originalInput);
			if (result.success) {
				onOpenChange(false);
				router.refresh();
			}
		});
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>파싱 결과 확인</DrawerTitle>
					<DrawerDescription>
						{items.length}건의 거래를 인식했습니다. 확인 후 저장하세요.
					</DrawerDescription>
				</DrawerHeader>

				<div className="max-h-[40vh] overflow-y-auto px-4">
					{items.map((item, index) => (
						<div
							key={`${item.description}-${item.amount}-${index}`}
							className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0"
						>
							<Badge variant={item.type === "income" ? "default" : "secondary"} className="shrink-0 text-xs">
								{item.type === "income" ? "수입" : "지출"}
							</Badge>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium truncate">{item.description}</p>
								<p className="text-xs text-muted-foreground">{item.category} · {item.date}</p>
							</div>
							<span className="text-sm font-semibold whitespace-nowrap">
								{formatSignedCurrency(item.amount, item.type)}
							</span>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 shrink-0"
								onClick={() => handleRemove(index)}
							>
								<X className="h-3.5 w-3.5" />
							</Button>
						</div>
					))}
				</div>

				<DrawerFooter>
					{(totalExpense > 0 || totalIncome > 0) && (
						<div className="flex justify-between text-sm mb-2">
							{totalExpense > 0 && (
								<span className="text-muted-foreground">
									지출 합계: <span className="font-semibold text-foreground">{formatCurrency(totalExpense)}</span>
								</span>
							)}
							{totalIncome > 0 && (
								<span className="text-muted-foreground">
									수입 합계: <span className="font-semibold text-blue-600">{formatCurrency(totalIncome)}</span>
								</span>
							)}
						</div>
					)}
					<Button onClick={handleSave} disabled={items.length === 0 || isPending}>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								저장 중...
							</>
						) : (
							`${items.length}건 저장`
						)}
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
