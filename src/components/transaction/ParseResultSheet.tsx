"use client";

// AI 분석 결과를 검수·확정하는 하단 시트 (수정/삭제/카테고리 추가 → 일괄 저장)

import { memo, useState, useTransition, useEffect, useCallback } from "react";
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
	DrawerDescription,
	DrawerFooter,
} from "@/components/ui/drawer";
import { formatCurrency, formatSignedCurrency, formatCurrencyInput, parseCurrencyInput } from "@/lib/format";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { createTransactions } from "@/server/actions/transaction";
import { addCategory } from "@/server/actions/settings";
import type { ParsedTransaction } from "@/server/llm/types";
import type { Category, Account } from "@/types";

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

// 계좌 미선택 센티넬 값
const NO_ACCOUNT = "__none__";

/**
 * [유틸리티: getDefaultIcon]
 * 특정 카테고리명에 매칭되는 아이콘이 있으면 반환하고, 
 * 없으면 수입/지출 타입에 따른 기본 아이콘(💵/📦)을 반환합니다.
 */
function getDefaultIcon(categoryName: string, type: "income" | "expense"): string {
	if (CATEGORY_ICON_MAP[categoryName]) return CATEGORY_ICON_MAP[categoryName];
	return type === "income" ? "💵" : "📦";
}

/**
 * [유틸리티: normalizeCategoryName]
 * 사용자가 입력한 카테고리명 앞뒤 공백을 제거하고 내부의 연속된 공백을 하나로 합칩니다.
 * 데이터 정규화(Data Normalization)의 한 예입니다.
 */
function normalizeCategoryName(name: string): string {
	return name.trim().replace(/\s+/g, " ");
}

/**
 * [유틸리티: categoryKey]
 * 카테고리를 고유하게 식별하기 위한 문자열 키를 만듭니다. (예: "expense:식비")
 * 맵(Map)이나 셋(Set)에서 중복을 체크할 때 유용하게 쓰입니다.
 */
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

interface DraftParsedTransaction {
	clientKey: string;
	value: ParsedTransaction;
}

let parsedDraftSequence = 0;

function createParsedDraft(item: ParsedTransaction): DraftParsedTransaction {
	return {
		clientKey: `parsed-draft-${parsedDraftSequence++}`,
		value: item,
	};
}

function createParsedDrafts(items: ParsedTransaction[]): DraftParsedTransaction[] {
	return items.map(createParsedDraft);
}

interface ParseResultSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: ParsedTransaction[];
	originalInput: string;
	categories: Category[];
	accounts?: Account[];
	splitMeta?: {
		transactionCount: number;
		accountCount: number;
	} | null;
}

/**
 * [내부 컴포넌트: EditableItem]
 * 분석된 결과 배열 중 '한 건'의 내역을 담당하는 컴포넌트입니다.
 * 요약 뷰와 확장된 편집 뷰 두 가지 모드를 가집니다.
 */
const EditableItem = memo(function EditableItem({
	itemId,
	item,
	index,
	categories,
	accounts = [],
	onUpdate,
	onRemove,
	onAddCategory,
	isAddingCategory,
}: {
	itemId: string;
	item: ParsedTransaction;
	index: number;
	categories: Category[];
	accounts?: Account[];
	onUpdate: (itemId: string, updated: ParsedTransaction) => void;
	onRemove: (itemId: string) => void;
	onAddCategory: (itemId: string, name: string, type: "income" | "expense") => void;
	isAddingCategory: boolean;
}) {
	const [expanded, setExpanded] = useState(false);

	const filteredCategories = categories.filter((c) => c.type === item.type);
	const assetAccounts = accounts.filter((a) => a.type === "asset");
	const debtAccounts = accounts.filter((a) => a.type === "debt");

	return (
		<div className="border-b border-border last:border-b-0">
			{/* 요약 행 */}
			<div className="flex items-center gap-2 py-2.5">
				<button
					type="button"
					aria-expanded={expanded}
					className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onClick={() => setExpanded((prev) => !prev)}
				>
					<span className="shrink-0 p-0.5 text-muted-foreground">
						{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
					</span>
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
				</button>

				{/* 항목 삭제 버튼은 아코디언 토글 버튼과 분리해 중첩 button 구조를 제거합니다. */}
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 shrink-0"
					onClick={() => onRemove(itemId)}
				>
					<X className="h-3.5 w-3.5" />
				</Button>
			</div>

			{/* [카테고리 추천 배너] AI가 분석한 '새로운 카테고리'를 DB에 즉시 등록하는 제안 창입니다. */}
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
						onClick={() => onAddCategory(itemId, item.suggestedCategory!, item.type)}
					>
						{isAddingCategory ? (
							<Loader2 className="h-3 w-3 animate-spin" />
						) : (
							"추가"
						)}
					</Button>
				</div>
			)}

			{/* [편집 패널] Framer Motion을 활용한 부드러운 아코디언 애니메이션 */}
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
								// 입력 변경 시 부모 상태 즉시 동기화
								onChange={(e) => onUpdate(itemId, { ...item, description: e.target.value })}
								className="h-8 text-sm"
							/>
						</div>

						{/* 금액 + 날짜: 금액 입력 시 콤마 등 포맷팅 처리를 실시간으로 수행합니다. */}
						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-1">
								<Label className="text-xs">금액</Label>
								<Input
									type="text"
									inputMode="numeric"
									value={formatCurrencyInput(String(item.amount))}
									onChange={(e) => {
										const digits = parseCurrencyInput(e.target.value);
										onUpdate(itemId, { ...item, amount: digits ? Number(digits) : 0 });
									}}
									className="h-8 text-sm"
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-xs">날짜</Label>
								<Input
									type="date"
									value={item.date}
									// 날짜 선택 시 해당 항목의 date 필드만 교체합니다.
									onChange={(e) => onUpdate(itemId, { ...item, date: e.target.value })}
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
									// 카테고리 직접 선택 시 AI 추천(suggestedCategory) 표시는 제거합니다.
									onValueChange={(value) => onUpdate(itemId, { ...item, category: value, suggestedCategory: undefined })}
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
										onUpdate(itemId, {
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
									// 고정 거래 토글 시, 활성화된 경우 현재 날짜를 기반으로 '매월 N일' 기본값을 설정합니다.
									onCheckedChange={(checked) =>
										onUpdate(itemId, {
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
										// 매월 몇 일인지 숫자를 변경할 때의 핸들러입니다.
										onChange={(e) => onUpdate(itemId, { ...item, dayOfMonth: Number(e.target.value) || undefined })}
										className="h-7 w-14 text-center text-xs"
									/>
									<Label className="text-xs text-muted-foreground">일</Label>
								</div>
							)}
						</div>

						{/* 계좌 */}
						{accounts.length > 0 && (
							<div className="space-y-1">
								<Label className="text-xs">계좌 (선택사항)</Label>
								<Select
									value={item.accountId ?? NO_ACCOUNT}
									onValueChange={(value) =>
										onUpdate(itemId, { ...item, accountId: value === NO_ACCOUNT ? null : value })
									}
								>
									<SelectTrigger className="h-8 text-sm">
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
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
});

/**
 * [메인 컴포넌트: ParseResultSheet]
 */
export function ParseResultSheet({
	open,
	onOpenChange,
	items: initialItems,
	originalInput,
	categories: initialCategories,
	accounts = [],
	splitMeta,
}: ParseResultSheetProps) {
	const router = useRouter();

	// 로컬 상태: 분석된 내역들과 카테고리 목록을 관리합니다.
	const [draftItems, setDraftItems] = useState<DraftParsedTransaction[]>(() => createParsedDrafts(initialItems));
	const [localCategories, setLocalCategories] = useState<Category[]>(initialCategories);

	// UX: 서버 작업 중 UI 블로킹을 방지하기 위한 Transitions 및 전용 로딩 훅
	const [isPending, startTransition] = useTransition();
	const { showSpinner, startLoading, stopLoading } = useDeferredLoading(200);

	// 상태 제어: 카테고리 추가 작업 중임을 추적하는 Set
	const [pendingCategoryKeys, setPendingCategoryKeys] = useState<Set<string>>(new Set());
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		setDraftItems(createParsedDrafts(initialItems));
		setErrorMessage(null);
	}, [initialItems]);

	useEffect(() => {
		setLocalCategories(initialCategories);
	}, [initialCategories]);

	// 특정 항목 수정 (불변성 유지 + 다른 항목 참조 유지)
	const handleUpdate = useCallback((itemId: string, updated: ParsedTransaction) => {
		setDraftItems((prev) =>
			prev.map((draft) => (draft.clientKey === itemId ? { ...draft, value: updated } : draft)),
		);
	}, []);

	// 항목 삭제 — 마지막 항목 삭제 시 시트 자동 닫기 (queueMicrotask로 렌더 중 상태 변경 방지)
	const handleRemove = useCallback((itemId: string) => {
		setDraftItems((prev) => {
			const next = prev.filter((draft) => draft.clientKey !== itemId);
			if (next.length === 0) {
				queueMicrotask(() => onOpenChange(false));
			}
			return next;
		});
	}, [onOpenChange]);

	// AI 추천 카테고리 DB 등록 + 같은 suggestedCategory를 가진 항목 일괄 동기화
	const handleAddCategory = async (itemId: string, rawName: string, type: "income" | "expense") => {
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
				// 이미 같은 카테고리가 있다면 실패로 끝내지 않고 로컬 상태만 정렬해
				// "추천 추가" 직후 저장 플로우가 끊기지 않도록 맞춘다.
				setLocalCategories((prev) => upsertLocalCategory(prev, { name, type, icon }));

				// 해당 항목 + 같은 suggestedCategory를 가진 항목까지 일괄 동기화
				setDraftItems((prev) =>
					prev.map((draft) => {
						if (draft.clientKey === itemId) {
							return {
								...draft,
								value: { ...draft.value, category: name, suggestedCategory: undefined },
							};
						}
						if (
							draft.value.type === type
							&& draft.value.suggestedCategory
							&& normalizeCategoryName(draft.value.suggestedCategory) === name
						) {
							return {
								...draft,
								value: { ...draft.value, category: name, suggestedCategory: undefined },
							};
						}
						return draft;
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

	const parsedItems = draftItems.map((draft) => draft.value);

	// 현재 리스트 항목 금액 집계 (사용자 수정 시 실시간 반영)
	const totalExpense = parsedItems
		.filter((i) => i.type === "expense")
		.reduce((sum, i) => sum + i.amount, 0);
	const totalIncome = parsedItems
		.filter((i) => i.type === "income")
		.reduce((sum, i) => sum + i.amount, 0);

	const hasPendingCategoryAdds = pendingCategoryKeys.size > 0;

	// 모든 내역 일괄 DB 저장
	const handleSave = () => {
		if (draftItems.length === 0 || hasPendingCategoryAdds) return;
		setErrorMessage(null);

		startTransition(async () => {
			startLoading(); // 지연된 로딩 스피너 시작
			try {
				// 서버 액션: 한꺼번에 거래 생성 (Bulk insert)
				const result = await createTransactions(parsedItems, originalInput);
				if (result.success) {
					onOpenChange(false); // 시트 닫기

					// 만약 '혼합 입력(거래+자산)' Flow 중이라면, 부모 오케스트레이터가 자산 시트를 열도록 유도합니다.
					if (splitMeta) {
						return;
					}

					// 단순 거래 저장인 경우 목록 페이지로 이동하며 성공 메시지 파라미터 전달
					router.push("/transactions?saved=tx");
					return;
				}

				setErrorMessage(result.error);
			} catch (error) {
				console.error("[ParseResultSheet] 거래 저장 실패", error);
				setErrorMessage("거래 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
			} finally {
				stopLoading();
			}
		});
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>파싱 결과 확인</DrawerTitle>
					<DrawerDescription>
						{draftItems.length}건의 거래를 인식했습니다. 항목을 눌러 수정할 수 있습니다.
					</DrawerDescription>
					{splitMeta && (
						<p className="text-xs text-muted-foreground">
							입력 내용을 <strong className="text-foreground">거래 {splitMeta.transactionCount}건 + 자산/부채 {splitMeta.accountCount}건</strong>으로 분리했습니다.
							 거래 저장 후 자산/부채 등록 단계로 이어집니다.
						</p>
					)}
				</DrawerHeader>

				<div className="max-h-[50vh] overflow-y-auto px-4">
					{draftItems.map((draft, index) => {
						const key = draft.value.suggestedCategory
							? categoryKey(draft.value.type, draft.value.suggestedCategory)
							: null;
						return (
							<EditableItem
								key={draft.clientKey}
								itemId={draft.clientKey}
								item={draft.value}
								index={index}
								categories={localCategories}
								accounts={accounts}
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
					<Button onClick={handleSave} disabled={draftItems.length === 0 || isPending || hasPendingCategoryAdds}>
						{showSpinner ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								저장 중...
							</>
						) : splitMeta ? (
							`${draftItems.length}건 저장 후 자산 단계로`
						) : (
							`${draftItems.length}건 저장`
						)}
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
