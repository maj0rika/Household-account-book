"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, ChevronDown, ChevronUp, RefreshCw, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { formatCurrency } from "@/lib/format";
import { createAccount, updateAccount } from "@/server/actions/account";
import type { ParsedAccount } from "@/server/llm/types";
import type { Account } from "@/types";

const ASSET_SUB_TYPES = [
	{ value: "bank", label: "은행 계좌", icon: "🏦" },
	{ value: "cash", label: "현금", icon: "💵" },
	{ value: "savings", label: "적금/예금", icon: "🏧" },
	{ value: "investment", label: "투자", icon: "📈" },
	{ value: "other", label: "기타", icon: "📦" },
] as const;

const DEBT_SUB_TYPES = [
	{ value: "credit_card", label: "신용카드", icon: "💳" },
	{ value: "loan", label: "대출", icon: "🏠" },
	{ value: "other", label: "기타", icon: "📦" },
] as const;

// 기존 계정 매칭 결과
interface MatchedItem {
	parsed: ParsedAccount;
	matchedAccount: Account | null; // null = 신규 생성
	action: "create" | "update"; // 기본값: 매칭되면 update, 아니면 create
}

function findMatch(parsed: ParsedAccount, existing: Account[]): Account | null {
	// 정확 매칭
	const exact = existing.find(
		(a) => a.name === parsed.name && a.type === parsed.type,
	);
	if (exact) return exact;

	// 이름만 매칭 (type 무관)
	const nameMatch = existing.find((a) => a.name === parsed.name);
	if (nameMatch) return nameMatch;

	return null;
}

function EditableAccountItem({
	item,
	index,
	onUpdate,
	onRemove,
}: {
	item: MatchedItem;
	index: number;
	onUpdate: (index: number, updated: MatchedItem) => void;
	onRemove: (index: number) => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const { parsed, matchedAccount, action } = item;
	const subTypes = parsed.type === "asset" ? ASSET_SUB_TYPES : DEBT_SUB_TYPES;

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
				<span className="text-lg">{parsed.icon}</span>
				<Badge
					variant={parsed.type === "asset" ? "default" : "secondary"}
					className="shrink-0 text-xs"
				>
					{parsed.type === "asset" ? "자산" : "부채"}
				</Badge>
				{matchedAccount ? (
					<Badge
						variant={action === "update" ? "outline" : "default"}
						className="shrink-0 gap-1 text-xs cursor-pointer"
						onClick={() =>
							onUpdate(index, {
								...item,
								action: action === "update" ? "create" : "update",
							})
						}
					>
						{action === "update" ? (
							<><RefreshCw className="h-2.5 w-2.5" />업데이트</>
						) : (
							<><PlusCircle className="h-2.5 w-2.5" />신규</>
						)}
					</Badge>
				) : (
					<Badge variant="outline" className="shrink-0 gap-1 text-xs">
						<PlusCircle className="h-2.5 w-2.5" />신규
					</Badge>
				)}
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium">{parsed.name}</p>
				</div>
				<span className={`shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums ${
					parsed.type === "debt" ? "text-expense" : "text-foreground"
				}`}>
					{formatCurrency(parsed.balance)}
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

			{/* 매칭 정보 배너 */}
			{matchedAccount && action === "update" && (
				<div className="mx-1 mb-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5">
					<span className="text-xs text-muted-foreground">
						기존 잔액 <strong className="text-foreground">{formatCurrency(matchedAccount.balance)}</strong>
						→ <strong className="text-foreground">{formatCurrency(parsed.balance)}</strong>으로 변경
					</span>
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
						{/* 이름 */}
						<div className="space-y-1">
							<Label className="text-xs">이름</Label>
							<Input
								value={parsed.name}
								onChange={(e) =>
									onUpdate(index, {
										...item,
										parsed: { ...parsed, name: e.target.value },
									})
								}
								className="h-8 text-sm"
							/>
						</div>

						{/* 유형 + 세부 유형 */}
						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-1">
								<Label className="text-xs">유형</Label>
								<Select
									value={parsed.type}
									onValueChange={(value) =>
										onUpdate(index, {
											...item,
											parsed: {
												...parsed,
												type: value as "asset" | "debt",
												subType: value === "asset" ? "bank" : "credit_card",
												icon: value === "asset" ? "🏦" : "💳",
											},
										})
									}
								>
									<SelectTrigger className="h-8 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="asset">자산</SelectItem>
										<SelectItem value="debt">부채</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1">
								<Label className="text-xs">세부 유형</Label>
								<Select
									value={parsed.subType}
									onValueChange={(value) =>
										onUpdate(index, {
											...item,
											parsed: { ...parsed, subType: value as ParsedAccount["subType"] },
										})
									}
								>
									<SelectTrigger className="h-8 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{subTypes.map((st) => (
											<SelectItem key={st.value} value={st.value}>
												{st.icon} {st.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* 잔액 */}
						<div className="space-y-1">
							<Label className="text-xs">
								{parsed.type === "debt" ? "부채 금액 (원)" : "잔액 (원)"}
							</Label>
							<Input
								type="number"
								value={parsed.balance}
								onChange={(e) =>
									onUpdate(index, {
										...item,
										parsed: { ...parsed, balance: Number(e.target.value) || 0 },
									})
								}
								className="h-8 text-sm"
							/>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

interface AccountParseResultSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: ParsedAccount[];
	existingAccounts: Account[];
}

export function AccountParseResultSheet({
	open,
	onOpenChange,
	items: initialItems,
	existingAccounts,
}: AccountParseResultSheetProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [matchedItems, setMatchedItems] = useState<MatchedItem[]>([]);

	useEffect(() => {
		const matched = initialItems.map((parsed) => {
			const matchedAccount = findMatch(parsed, existingAccounts);
			return {
				parsed,
				matchedAccount,
				action: (matchedAccount ? "update" : "create") as "create" | "update",
			};
		});
		setMatchedItems(matched);
	}, [initialItems, existingAccounts]);

	const handleUpdate = (index: number, updated: MatchedItem) => {
		setMatchedItems((prev) => prev.map((item, i) => (i === index ? updated : item)));
	};

	const handleRemove = (index: number) => {
		setMatchedItems((prev) => {
			const next = prev.filter((_, i) => i !== index);
			if (next.length === 0) {
				onOpenChange(false);
			}
			return next;
		});
	};

	const handleSave = () => {
		if (matchedItems.length === 0) return;

		startTransition(async () => {
			let hasError = false;

			for (const item of matchedItems) {
				if (item.action === "update" && item.matchedAccount) {
					const result = await updateAccount(item.matchedAccount.id, {
						balance: item.parsed.balance,
						name: item.parsed.name,
						icon: item.parsed.icon,
						subType: item.parsed.subType,
					});
					if (!result.success) {
						hasError = true;
					}
				} else {
					const result = await createAccount({
						name: item.parsed.name,
						type: item.parsed.type,
						subType: item.parsed.subType,
						icon: item.parsed.icon,
						balance: item.parsed.balance,
					});
					if (!result.success) {
						hasError = true;
					}
				}
			}

			if (!hasError) {
				onOpenChange(false);
				router.refresh();
			}
		});
	};

	const createCount = matchedItems.filter((i) => i.action === "create").length;
	const updateCount = matchedItems.filter((i) => i.action === "update").length;

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>자산/부채 파싱 결과</DrawerTitle>
					<DrawerDescription>
						{matchedItems.length}건을 인식했습니다. 항목을 눌러 수정할 수 있습니다.
					</DrawerDescription>
				</DrawerHeader>

				<div className="max-h-[50vh] overflow-y-auto px-4">
					{matchedItems.map((item, index) => (
						<EditableAccountItem
							key={`${item.parsed.name}-${item.parsed.balance}-${index}`}
							item={item}
							index={index}
							onUpdate={handleUpdate}
							onRemove={handleRemove}
						/>
					))}
				</div>

				<DrawerFooter>
					{(createCount > 0 || updateCount > 0) && (
						<div className="mb-2 flex gap-3 text-sm">
							{createCount > 0 && (
								<span className="text-muted-foreground">
									신규 <span className="font-semibold text-foreground">{createCount}건</span>
								</span>
							)}
							{updateCount > 0 && (
								<span className="text-muted-foreground">
									업데이트 <span className="font-semibold text-foreground">{updateCount}건</span>
								</span>
							)}
						</div>
					)}
					<Button onClick={handleSave} disabled={matchedItems.length === 0 || isPending}>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								저장 중...
							</>
						) : (
							`${matchedItems.length}건 저장`
						)}
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
