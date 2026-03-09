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
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/lib/format";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { upsertParsedAccountsBatch } from "@/server/actions/account";
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
					className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
					onClick={() => setExpanded((prev) => !prev)}
					aria-expanded={expanded}
				>
					<span className="shrink-0 p-0.5 text-muted-foreground">
						{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
					</span>
					<span className="text-lg">{parsed.icon}</span>
					<Badge
						variant={parsed.type === "asset" ? "default" : "secondary"}
						className="shrink-0 text-xs"
					>
						{parsed.type === "asset" ? "자산" : "부채"}
					</Badge>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium">{parsed.name}</p>
					</div>
					<span className={`shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums ${
						parsed.type === "debt" ? "text-expense" : "text-foreground"
					}`}>
						{formatCurrency(parsed.balance)}
					</span>
				</button>
				{matchedAccount ? (
					<Badge
						asChild
						variant={action === "update" ? "outline" : "default"}
						className="gap-1 text-xs"
					>
						<button
							type="button"
							onClick={() =>
								onUpdate(index, {
									...item,
									action: action === "update" ? "create" : "update",
								})
							}
							aria-label={action === "update" ? "신규 계정으로 변경" : "기존 계정 업데이트로 변경"}
						>
							{action === "update" ? (
								<><RefreshCw className="h-2.5 w-2.5" />업데이트</>
							) : (
								<><PlusCircle className="h-2.5 w-2.5" />신규</>
							)}
						</button>
					</Badge>
				) : (
					<Badge variant="outline" className="shrink-0 gap-1 text-xs">
						<PlusCircle className="h-2.5 w-2.5" />신규
					</Badge>
				)}
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 shrink-0"
					onClick={() => onRemove(index)}
					aria-label="자산 항목 삭제"
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
								type="text"
								inputMode="numeric"
								value={formatCurrencyInput(String(parsed.balance))}
								onChange={(e) =>
									onUpdate(index, {
										...item,
										parsed: {
											...parsed,
											balance: Number(parseCurrencyInput(e.target.value)) || 0,
										},
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
	splitMeta?: {
		transactionCount: number;
		accountCount: number;
	} | null;
}

export function AccountParseResultSheet({
	open,
	onOpenChange,
	items: initialItems,
	existingAccounts,
	splitMeta,
}: AccountParseResultSheetProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const { showSpinner, startLoading, stopLoading } = useDeferredLoading(200);
	const [matchedItems, setMatchedItems] = useState<MatchedItem[]>([]);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
		setErrorMessage(null);
	}, [initialItems, existingAccounts]);

	const handleUpdate = (index: number, updated: MatchedItem) => {
		setMatchedItems((prev) => prev.map((item, i) => (i === index ? updated : item)));
	};

	const handleRemove = (index: number) => {
		setMatchedItems((prev) => {
			const next = prev.filter((_, i) => i !== index);
			if (next.length === 0) {
				queueMicrotask(() => onOpenChange(false));
			}
			return next;
		});
	};

	const handleSave = () => {
		if (matchedItems.length === 0) return;
		setErrorMessage(null);

		startTransition(async () => {
			startLoading();
			try {
				const result = await upsertParsedAccountsBatch(
					matchedItems.map((item) => {
						if (item.action === "update" && item.matchedAccount) {
							return {
								action: "update" as const,
								accountId: item.matchedAccount.id,
								name: item.parsed.name,
								type: item.parsed.type,
								subType: item.parsed.subType,
								icon: item.parsed.icon,
								balance: item.parsed.balance,
							};
						}
						return {
							action: "create" as const,
							name: item.parsed.name,
							type: item.parsed.type,
							subType: item.parsed.subType,
							icon: item.parsed.icon,
							balance: item.parsed.balance,
						};
					}),
				);

				if (result.success) {
					onOpenChange(false);

					// 혼합 저장 완료 시 거래 탭 유지
					if (splitMeta) {
						router.push("/transactions?saved=mixed&focus=list");
						return;
					}

					// 자산만 저장된 경우 자산 탭으로 이동/포커스
					router.push("/assets?saved=account&focus=accounts");
					return;
				}

				setErrorMessage(result.error);
			} catch (error) {
				console.error("[AccountParseResultSheet] 자산/부채 저장 실패", error);
				setErrorMessage("자산/부채 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
			} finally {
				stopLoading();
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
					{splitMeta && (
						<p className="text-xs text-muted-foreground">
							이전 입력은 거래 {splitMeta.transactionCount}건과 자산/부채 {splitMeta.accountCount}건으로 분리되었고,
							 현재 자산/부채 등록 단계입니다.
						</p>
					)}
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
					{errorMessage && (
						<p className="mb-1 whitespace-pre-wrap text-xs text-destructive">{errorMessage}</p>
					)}
					<Button onClick={handleSave} disabled={matchedItems.length === 0 || isPending}>
						{showSpinner ? (
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
