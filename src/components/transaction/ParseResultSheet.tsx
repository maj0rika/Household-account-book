"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, ChevronDown, ChevronUp, Repeat, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
	DrawerDescription,
	DrawerFooter,
} from "@/components/ui/drawer";
import { formatCurrency, formatSignedCurrency } from "@/lib/format";
import { createTransactions } from "@/server/actions/transaction";
import { addCategory } from "@/server/actions/settings";
import type { ParsedTransaction } from "@/server/llm/types";
import type { Category } from "@/types";

// 카테고리 타입별 기본 아이콘 매핑
const CATEGORY_ICON_MAP: Record<string, string> = {
	"반려동물": "🐾",
	"구독": "📺",
	"보험": "🛡️",
	"자동차": "🚗",
	"운동/스포츠": "🏋️",
	"여행": "✈️",
	"술/유흥": "🍻",
	"경조사": "💐",
	"저축": "🏦",
	"배달": "🛵",
};

function getDefaultIcon(categoryName: string, type: "income" | "expense"): string {
	if (CATEGORY_ICON_MAP[categoryName]) return CATEGORY_ICON_MAP[categoryName];
	return type === "income" ? "💵" : "📦";
}

function normalizeCategoryName(name: string): string {
	return name.trim().replace(/\s+/g, " ");
}

function categoryKey(type: "income" | "expense", name: string): string {
	return `${type}:${normalizeCategoryName(name)}`;
}

function upsertLocalCategory(
	prev: Category[],
	category: Pick<Category, "name" | "type" | "icon">,
): Category[] {
	const normalizedName = normalizeCategoryName(category.name);
	const exists = prev.some(
		(c) => c.type === category.type && normalizeCategoryName(c.name) === normalizedName,
	);
	if (exists) return prev;

	const next: Category = {
		id: `temp-${category.type}-${normalizedName}`,
		userId: null,
		name: normalizedName,
		icon: category.icon,
		type: category.type,
		sortOrder: prev.length,
		isDefault: false,
	};
	return [...prev, next];
}

interface ParseResultSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: ParsedTransaction[];
	originalInput: string;
	categories: Category[];
	splitMeta?: {
		transactionCount: number;
		accountCount: number;
	} | null;
}

function EditableItem({
	item,
	index,
	categories,
	onUpdate,
	onRemove,
	onAddCategory,
	isAddingCategory,
}: {
	item: ParsedTransaction;
	index: number;
	categories: Category[];
	onUpdate: (index: number, updated: ParsedTransaction) => void;
	onRemove: (index: number) => void;
	onAddCategory: (index: number, name: string, type: "income" | "expense") => void;
	isAddingCategory: boolean;
}) {
	const [expanded, setExpanded] = useState(false);

	const filteredCategories = categories.filter((c) => c.type === item.type);

	return (
		<div className="border-b border-border last:border-b-0">
			{/* 요약 행 */}
			<div className="flex items-center gap-2 py-2.5">
				<button
					type="button"
					className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
					onClick={() => setExpanded(!expanded)}
				>
					{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
				</button>
				<Badge variant={item.type === "income" ? "default" : "secondary"} className="shrink-0 text-xs">
					{item.type === "income" ? "수입" : "지출"}
				</Badge>
				{item.isRecurring && (
					<Badge variant="outline" className="shrink-0 gap-1 text-xs">
						<Repeat className="h-2.5 w-2.5" />
						고정
					</Badge>
				)}
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium">{item.description}</p>
					<p className="text-xs text-muted-foreground">{item.category} · {item.date}</p>
				</div>
				<span className="shrink-0 whitespace-nowrap text-sm font-semibold">
					{formatSignedCurrency(item.amount, item.type)}
				</span>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 shrink-0"
					onClick={() => onRemove(index)}
				>
					<X className="h-3.5 w-3.5" />
				</Button>
			</div>

			{/* 카테고리 추천 배너 */}
			{item.suggestedCategory && (
				<div className="mx-1 mb-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
					<Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
					<span className="flex-1 text-xs text-muted-foreground">
						<strong className="text-foreground">&quot;{item.suggestedCategory}&quot;</strong> 카테고리를 추가할까요?
					</span>
					<Button
						size="sm"
						variant="outline"
						className="h-6 px-2 text-xs"
						disabled={isAddingCategory}
						onClick={() => onAddCategory(index, item.suggestedCategory!, item.type)}
					>
						{isAddingCategory ? (
							<Loader2 className="h-3 w-3 animate-spin" />
						) : (
							"추가"
						)}
					</Button>
				</div>
			)}

			{/* 편집 패널 */}
			<AnimatePresence>
				{expanded && (
					<motion.div
						className="space-y-3 pb-3 pl-6 pr-2"
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
					>
						{/* 설명 */}
						<div className="space-y-1">
							<Label className="text-xs">설명</Label>
							<Input
								value={item.description}
								onChange={(e) => onUpdate(index, { ...item, description: e.target.value })}
								className="h-8 text-sm"
							/>
						</div>

						{/* 금액 + 날짜 */}
						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-1">
								<Label className="text-xs">금액</Label>
								<Input
									type="number"
									value={item.amount}
									onChange={(e) => onUpdate(index, { ...item, amount: Number(e.target.value) || 0 })}
									className="h-8 text-sm"
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-xs">날짜</Label>
								<Input
									type="date"
									value={item.date}
									onChange={(e) => onUpdate(index, { ...item, date: e.target.value })}
									className="h-8 text-sm"
								/>
							</div>
						</div>

						{/* 카테고리 + 타입 */}
						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-1">
								<Label className="text-xs">카테고리</Label>
								<Select
									value={item.category}
									onValueChange={(value) => onUpdate(index, { ...item, category: value, suggestedCategory: undefined })}
								>
									<SelectTrigger className="h-8 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{filteredCategories.map((cat) => (
											<SelectItem key={cat.id} value={cat.name}>
												{cat.icon} {cat.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1">
								<Label className="text-xs">유형</Label>
								<Select
									value={item.type}
									onValueChange={(value) =>
										onUpdate(index, {
											...item,
											type: value as "income" | "expense",
											category: value === "income" ? "기타 수입" : "기타 지출",
										})
									}
								>
									<SelectTrigger className="h-8 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="expense">지출</SelectItem>
										<SelectItem value="income">수입</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* 고정 거래 토글 */}
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-2">
								<Switch
									id={`recurring-${index}`}
									checked={item.isRecurring ?? false}
									onCheckedChange={(checked) =>
										onUpdate(index, {
											...item,
											isRecurring: checked,
											dayOfMonth: checked ? (item.dayOfMonth ?? new Date(item.date).getDate()) : undefined,
										})
									}
								/>
								<Label htmlFor={`recurring-${index}`} className="text-xs">
									고정 거래
								</Label>
							</div>
							{item.isRecurring && (
								<div className="flex items-center gap-1">
									<Label className="text-xs text-muted-foreground">매월</Label>
									<Input
										type="number"
										min={1}
										max={31}
										value={item.dayOfMonth ?? ""}
										onChange={(e) => onUpdate(index, { ...item, dayOfMonth: Number(e.target.value) || undefined })}
										className="h-7 w-14 text-center text-xs"
									/>
									<Label className="text-xs text-muted-foreground">일</Label>
								</div>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

export function ParseResultSheet({
	open,
	onOpenChange,
	items: initialItems,
	originalInput,
	categories: initialCategories,
	splitMeta,
}: ParseResultSheetProps) {
	const router = useRouter();
	const [items, setItems] = useState<ParsedTransaction[]>(initialItems);
	const [localCategories, setLocalCategories] = useState<Category[]>(initialCategories);
	const [isPending, startTransition] = useTransition();
	const [pendingCategoryKeys, setPendingCategoryKeys] = useState<Set<string>>(new Set());
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		setItems(initialItems);
		setErrorMessage(null);
	}, [initialItems]);

	useEffect(() => {
		setLocalCategories(initialCategories);
	}, [initialCategories]);

	const handleUpdate = (index: number, updated: ParsedTransaction) => {
		setItems((prev) => prev.map((item, i) => (i === index ? updated : item)));
	};

	const handleRemove = (index: number) => {
		setItems((prev) => {
			const next = prev.filter((_, i) => i !== index);
			// 모든 항목이 제거되면 다음 틱에서 시트를 닫음 (렌더 중 부모 setState 방지)
			if (next.length === 0) {
				queueMicrotask(() => onOpenChange(false));
			}
			return next;
		});
	};

	const handleAddCategory = async (index: number, rawName: string, type: "income" | "expense") => {
		const name = normalizeCategoryName(rawName);
		if (!name) return;

		const key = categoryKey(type, name);
		if (pendingCategoryKeys.has(key)) return;

		setErrorMessage(null);
		setPendingCategoryKeys((prev) => {
			const next = new Set(prev);
			next.add(key);
			return next;
		});

		try {
			const icon = getDefaultIcon(name, type);
			const result = await addCategory({ name, icon, type });
			const duplicate = !result.success && result.error.includes("이미 같은 이름의 카테고리");

			if (result.success || duplicate) {
				setLocalCategories((prev) => upsertLocalCategory(prev, { name, type, icon }));

				// 해당 항목 + 같은 suggestedCategory를 가진 항목까지 일괄 동기화
				setItems((prev) =>
					prev.map((item, i) => {
						if (i === index) {
							return { ...item, category: name, suggestedCategory: undefined };
						}
						if (
							item.type === type
							&& item.suggestedCategory
							&& normalizeCategoryName(item.suggestedCategory) === name
						) {
							return { ...item, category: name, suggestedCategory: undefined };
						}
						return item;
					}),
				);
			} else {
				setErrorMessage(result.error || "카테고리 추가에 실패했습니다.");
			}
		} catch (error) {
			console.error("[ParseResultSheet] 카테고리 추가 실패", error);
			setErrorMessage("카테고리 추가 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
		} finally {
			setPendingCategoryKeys((prev) => {
				const next = new Set(prev);
				next.delete(key);
				return next;
			});
		}
	};

	const totalExpense = items
		.filter((i) => i.type === "expense")
		.reduce((sum, i) => sum + i.amount, 0);
	const totalIncome = items
		.filter((i) => i.type === "income")
		.reduce((sum, i) => sum + i.amount, 0);

	const hasPendingCategoryAdds = pendingCategoryKeys.size > 0;

	const handleSave = () => {
		if (items.length === 0 || hasPendingCategoryAdds) return;
		setErrorMessage(null);

		startTransition(async () => {
			try {
				const result = await createTransactions(items, originalInput);
				if (result.success) {
					onOpenChange(false);
					router.refresh();
				} else {
					setErrorMessage(result.error);
				}
			} catch (error) {
				console.error("[ParseResultSheet] 거래 저장 실패", error);
				setErrorMessage("거래 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
			}
		});
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>파싱 결과 확인</DrawerTitle>
					<DrawerDescription>
						{items.length}건의 거래를 인식했습니다. 항목을 눌러 수정할 수 있습니다.
					</DrawerDescription>
					{splitMeta && (
						<p className="text-xs text-muted-foreground">
							입력 내용을 <strong className="text-foreground">거래 {splitMeta.transactionCount}건 + 자산/부채 {splitMeta.accountCount}건</strong>으로 분리했습니다.
							 거래 저장 후 자산/부채 등록 단계로 이어집니다.
						</p>
					)}
				</DrawerHeader>

				<div className="max-h-[50vh] overflow-y-auto px-4">
					{items.map((item, index) => {
						const key = item.suggestedCategory
							? categoryKey(item.type, item.suggestedCategory)
							: null;
						return (
							<EditableItem
								key={`${item.description}-${item.amount}-${index}`}
								item={item}
								index={index}
								categories={localCategories}
								onUpdate={handleUpdate}
								onRemove={handleRemove}
								onAddCategory={handleAddCategory}
								isAddingCategory={!!key && pendingCategoryKeys.has(key)}
							/>
						);
					})}
				</div>

				<DrawerFooter>
					{(totalExpense > 0 || totalIncome > 0) && (
						<div className="mb-2 flex justify-between text-sm">
							{totalExpense > 0 && (
								<span className="text-muted-foreground">
									지출 합계: <span className="font-semibold text-foreground">{formatCurrency(totalExpense)}</span>
								</span>
							)}
							{totalIncome > 0 && (
								<span className="text-muted-foreground">
									수입 합계: <span className="font-semibold text-income">{formatCurrency(totalIncome)}</span>
								</span>
							)}
						</div>
					)}
					{hasPendingCategoryAdds && (
						<p className="mb-1 text-xs text-muted-foreground">카테고리 동기화 중입니다. 완료 후 저장해 주세요.</p>
					)}
					{errorMessage && (
						<p className="mb-1 whitespace-pre-wrap text-xs text-destructive">{errorMessage}</p>
					)}
					<Button onClick={handleSave} disabled={items.length === 0 || isPending || hasPendingCategoryAdds}>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								저장 중...
							</>
						) : splitMeta ? (
							`${items.length}건 저장 후 자산 단계로`
						) : (
							`${items.length}건 저장`
						)}
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
