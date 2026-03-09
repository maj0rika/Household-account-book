"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
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
import { formatCurrency, formatCurrencyInput, getCurrentMonth, parseCurrencyInput } from "@/lib/format";
import { getSettlementSourceLabel } from "@/lib/settlement";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { recordParsedSettlementTransfersBatch } from "@/server/actions/settlement";
import type {
	ParsedSettlementTransfer,
	ParsedSettlementTransferCandidate,
} from "@/server/llm/types";
import type { Account } from "@/types";

const NO_ACCOUNT = "__none__";

function buildCandidateValue(candidate: ParsedSettlementTransferCandidate): string {
	return `${candidate.settlementId}:${candidate.memberId ?? ""}`;
}

function getCandidateLabel(candidate: ParsedSettlementTransferCandidate): string {
	if (candidate.memberName) {
		return `${candidate.settlementTitle} · ${candidate.memberName} · 잔여 ${formatCurrency(candidate.outstandingAmount)}`;
	}

	return `${candidate.settlementTitle} · 잔여 ${formatCurrency(candidate.outstandingAmount)}`;
}

function getRedirectPath(items: EditableTransferItem[]): string {
	const month = items[0]?.date?.slice(0, 7) || getCurrentMonth();
	const settlementIds = Array.from(
		new Set(
			items
				.map((item) => item.selectedCandidateValue?.split(":")[0] ?? null)
				.filter((value): value is string => Boolean(value)),
		),
	);

	if (settlementIds.length === 1) {
		return `/settlements?month=${month}&settlementId=${settlementIds[0]}`;
	}

	return `/settlements?month=${month}`;
}

interface EditableTransferItem {
	date: string;
	direction: "receive" | "send";
	amount: string;
	counterpartyName: string;
	memo: string;
	accountId: string;
	sourceType?: "text" | "image" | "manual";
	sourceService?: "kakao" | "toss" | "unknown";
	candidates: ParsedSettlementTransferCandidate[];
	selectedCandidateValue: string | null;
}

function EditableTransferCard({
	item,
	index,
	accounts,
	onUpdate,
	onRemove,
}: {
	item: EditableTransferItem;
	index: number;
	accounts: Account[];
	onUpdate: (index: number, item: EditableTransferItem) => void;
	onRemove: (index: number) => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const assetAccounts = accounts.filter((account) => account.type === "asset");
	const sourceLabel = getSettlementSourceLabel({
		sourceType: item.sourceType,
		sourceService: item.sourceService,
	});
	const selectedCandidate = item.candidates.find(
		(candidate) => buildCandidateValue(candidate) === item.selectedCandidateValue,
	) ?? null;

	return (
		<div className="border-b border-border last:border-b-0">
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
					<Badge variant={item.direction === "receive" ? "default" : "secondary"}>
						{item.direction === "receive" ? "수금" : "송금"}
					</Badge>
					{sourceLabel && (
						<Badge variant="outline">
							{sourceLabel}
						</Badge>
					)}
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium">
							{selectedCandidate?.settlementTitle ?? item.counterpartyName ?? "정산 이력"}
						</p>
						<p className="truncate text-xs text-muted-foreground">
							{item.counterpartyName || "상대 미확인"}
							{selectedCandidate?.memberName ? ` · ${selectedCandidate.memberName}` : ""}
							{` · ${item.date}`}
						</p>
					</div>
					<span className="shrink-0 whitespace-nowrap text-sm font-semibold">
						{formatCurrency(Number(item.amount) || 0)}
					</span>
				</button>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 shrink-0"
					onClick={() => onRemove(index)}
					aria-label="정산 이력 항목 삭제"
				>
					<X className="h-3.5 w-3.5" />
				</Button>
			</div>

			{!selectedCandidate && (
				<div className="mx-1 mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
					자동 매칭이 확실하지 않습니다. 저장 전에 연결할 정산을 선택해 주세요.
				</div>
			)}

			<AnimatePresence>
				{expanded && (
					<motion.div
						className="space-y-3 pb-3 pl-6 pr-2"
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
					>
						<div className="space-y-1">
							<Label className="text-xs">연결할 정산</Label>
							<Select
								value={item.selectedCandidateValue ?? undefined}
								onValueChange={(value) => onUpdate(index, { ...item, selectedCandidateValue: value })}
							>
								<SelectTrigger className="h-8 w-full text-sm">
									<SelectValue placeholder="정산 선택" />
								</SelectTrigger>
								<SelectContent>
									{item.candidates.length > 0 ? (
										<SelectGroup>
											<SelectLabel>후보</SelectLabel>
											{item.candidates.map((candidate) => (
												<SelectItem
													key={buildCandidateValue(candidate)}
													value={buildCandidateValue(candidate)}
												>
													{getCandidateLabel(candidate)}
												</SelectItem>
											))}
										</SelectGroup>
									) : (
										<SelectItem value="__none__" disabled>
											연결 가능한 정산이 없습니다
										</SelectItem>
									)}
								</SelectContent>
							</Select>
						</div>

						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-1">
								<Label className="text-xs">금액</Label>
								<Input
									type="text"
									inputMode="numeric"
									value={formatCurrencyInput(item.amount)}
									onChange={(e) =>
										onUpdate(index, {
											...item,
											amount: parseCurrencyInput(e.target.value),
										})
									}
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

						<div className="space-y-1">
							<Label className="text-xs">계좌 (선택사항)</Label>
							<Select
								value={item.accountId}
								onValueChange={(value) =>
									onUpdate(index, {
										...item,
										accountId: value,
									})
								}
							>
								<SelectTrigger className="h-8 w-full text-sm">
									<SelectValue placeholder="계좌 선택" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={NO_ACCOUNT}>선택 안 함</SelectItem>
									{assetAccounts.length > 0 && (
										<SelectGroup>
											<SelectLabel>자산</SelectLabel>
											{assetAccounts.map((account) => (
												<SelectItem key={account.id} value={account.id}>
													{account.icon} {account.name}
												</SelectItem>
											))}
										</SelectGroup>
									)}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1">
							<Label className="text-xs">메모</Label>
							<Input
								value={item.memo}
								onChange={(e) => onUpdate(index, { ...item, memo: e.target.value })}
								placeholder={item.direction === "receive" ? "예: 입금 알림 자동 기록" : "예: 송금 완료 자동 기록"}
								className="h-8 text-sm"
							/>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

interface SettlementTransferParseResultSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: ParsedSettlementTransfer[];
	accounts: Account[];
	splitMeta?: {
		transactionCount: number;
		accountCount: number;
		transferCount?: number;
	} | null;
}

export function SettlementTransferParseResultSheet({
	open,
	onOpenChange,
	items: initialItems,
	accounts,
	splitMeta,
}: SettlementTransferParseResultSheetProps) {
	const router = useRouter();
	const [items, setItems] = useState<EditableTransferItem[]>([]);
	const [isPending, startTransition] = useTransition();
	const { showSpinner, startLoading, stopLoading } = useDeferredLoading(200);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		setItems(
			initialItems.map((item) => ({
				date: item.date,
				direction: item.direction,
				amount: String(item.amount),
				counterpartyName: item.counterpartyName ?? "",
				memo: item.memo ?? "",
				sourceType: item.sourceType,
				sourceService: item.sourceService,
				candidates: item.candidates ?? [],
				selectedCandidateValue: item.matchedSettlementId
					? `${item.matchedSettlementId}:${item.matchedMemberId ?? ""}`
					: null,
				accountId: NO_ACCOUNT,
			} as EditableTransferItem)),
		);
		setErrorMessage(null);
	}, [initialItems]);

	const handleUpdate = (index: number, nextItem: EditableTransferItem) => {
		setItems((prev) => prev.map((item, itemIndex) => (itemIndex === index ? nextItem : item)));
	};

	const handleRemove = (index: number) => {
		setItems((prev) => {
			const next = prev.filter((_, itemIndex) => itemIndex !== index);
			if (next.length === 0) {
				queueMicrotask(() => onOpenChange(false));
			}
			return next;
		});
	};

	const unresolvedCount = items.filter((item) => !item.selectedCandidateValue).length;

	const handleSave = () => {
		if (items.length === 0 || unresolvedCount > 0) return;
		setErrorMessage(null);

		startTransition(async () => {
			startLoading();
			try {
				const result = await recordParsedSettlementTransfersBatch(
					items.map((item) => {
						const [settlementId, memberId = ""] = item.selectedCandidateValue!.split(":");

						return {
							settlementId,
							memberId: memberId || null,
							accountId: item.accountId !== NO_ACCOUNT ? item.accountId : null,
							direction: item.direction,
							amount: Number(item.amount) || 0,
							memo: item.memo.trim() || null,
							occurredAt: new Date(`${item.date}T12:00:00`),
						};
					}),
				);

				if (!result.success) {
					setErrorMessage(result.error);
					return;
				}

				onOpenChange(false);
				router.push(getRedirectPath(items));
			} catch (error) {
				console.error("[SettlementTransferParseResultSheet] 정산 이력 저장 실패", error);
				setErrorMessage("정산 이력 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
			} finally {
				stopLoading();
			}
		});
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>정산 이력 후보 확인</DrawerTitle>
					<DrawerDescription>
						정산 송금/입금 알림을 거래가 아닌 정산 이력으로 기록합니다.
					</DrawerDescription>
					<p className="text-xs text-muted-foreground">
						가계부에는 수입/지출 거래를 추가하지 않고, 정산 보드만 갱신합니다.
					</p>
					{splitMeta && (
						<p className="text-xs text-muted-foreground">
							입력 내용을 거래 {splitMeta.transactionCount}건, 자산/부채 {splitMeta.accountCount}건, 정산 이력 {splitMeta.transferCount ?? items.length}건으로 분리했습니다.
						</p>
					)}
				</DrawerHeader>

				<div className="max-h-[50vh] overflow-y-auto px-4">
					{items.map((item, index) => (
						<EditableTransferCard
							key={`${item.direction}-${item.amount}-${item.date}-${index}`}
							item={item}
							index={index}
							accounts={accounts}
							onUpdate={handleUpdate}
							onRemove={handleRemove}
						/>
					))}
				</div>

				<DrawerFooter>
					{unresolvedCount > 0 && (
						<p className="mb-1 text-xs text-muted-foreground">
							연결할 정산이 선택되지 않은 항목 {unresolvedCount}건이 있습니다.
						</p>
					)}
					{errorMessage && (
						<p className="mb-1 whitespace-pre-wrap text-xs text-destructive">{errorMessage}</p>
					)}
					<Button
						onClick={handleSave}
						disabled={items.length === 0 || unresolvedCount > 0 || isPending}
					>
						{showSpinner ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								저장 중...
							</>
						) : (
							`${items.length}건 정산 이력 저장`
						)}
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
