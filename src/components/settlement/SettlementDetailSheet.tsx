"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Check, ExternalLink, Loader2, RotateCcw } from "lucide-react";

import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
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
	getSettlementDetail,
	recordSettlementTransfer,
	updateSettlementMemberStatus,
} from "@/server/actions/settlement";
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/lib/format";
import { getSettlementSourceLabel } from "@/lib/settlement";
import type { Account, SettlementDetail, SettlementMember } from "@/types";

const NO_ACCOUNT = "__none__";

function getStatusLabel(status: SettlementDetail["status"]): string {
	if (status === "completed") return "완료";
	if (status === "partial") return "진행중";
	return "대기";
}

function formatOccurredAt(date: Date): string {
	return new Intl.DateTimeFormat("ko-KR", {
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

interface SettlementDetailSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	settlementId: string | null;
	accounts: Account[];
	month: string;
	onUpdated?: (detail: SettlementDetail) => void;
}

export function SettlementDetailSheet({
	open,
	onOpenChange,
	settlementId,
	accounts,
	month,
	onUpdated,
}: SettlementDetailSheetProps) {
	const [detail, setDetail] = useState<SettlementDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
	const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
	const [transferAmount, setTransferAmount] = useState("");
	const [transferMemo, setTransferMemo] = useState("");
	const [transferAccountId, setTransferAccountId] = useState(NO_ACCOUNT);
	const [isPending, startTransition] = useTransition();
	const [isRecordingTransfer, startRecordingTransfer] = useTransition();

	const loadDetail = useCallback(async () => {
		if (!settlementId) {
			setDetail(null);
			return null;
		}

		setIsLoading(true);
		setError(null);
		try {
			const next = await getSettlementDetail(settlementId);
			setDetail(next);
			if (next) {
				onUpdated?.(next);
			}
			return next;
		} catch (loadError) {
			setError(loadError instanceof Error ? loadError.message : "정산 상세를 불러오지 못했습니다.");
			return null;
		} finally {
			setIsLoading(false);
		}
	}, [onUpdated, settlementId]);

	useEffect(() => {
		if (!open || !settlementId) return;
		void loadDetail();
	}, [loadDetail, open, settlementId]);

	useEffect(() => {
		if (!detail) {
			setSelectedMemberId(null);
			setTransferAmount("");
			setTransferMemo("");
			setTransferAccountId(NO_ACCOUNT);
			return;
		}

		if (detail.role === "organizer") {
			const defaultMember = detail.members.find((member) => member.paidAmount < member.shareAmount)
				?? detail.members[0]
				?? null;
			const remainingAmount = defaultMember
				? Math.max(defaultMember.shareAmount - defaultMember.paidAmount, 0)
				: 0;

			setSelectedMemberId(defaultMember?.id ?? null);
			setTransferAmount(remainingAmount > 0 ? String(remainingAmount) : "");
		} else {
			setSelectedMemberId(null);
			setTransferAmount(detail.outstandingAmount > 0 ? String(detail.outstandingAmount) : "");
		}

		setTransferMemo("");
		setTransferAccountId(NO_ACCOUNT);
	}, [detail]);

	const transactionHref = useMemo(() => {
		if (!detail) return `/transactions?month=${month}&focus=list`;
		return `/transactions?month=${month}&focus=list`;
	}, [detail, month]);

	const assetAccounts = useMemo(
		() => accounts.filter((account) => account.type === "asset"),
		[accounts],
	);
	const selectedMember = useMemo(
		() => detail?.members.find((member) => member.id === selectedMemberId) ?? null,
		[detail, selectedMemberId],
	);
	const selectedMemberRemainingAmount = selectedMember
		? Math.max(selectedMember.shareAmount - selectedMember.paidAmount, 0)
		: 0;
	const transferAmountValue = Number(transferAmount) || 0;
	const settlementSourceLabel = detail
		? getSettlementSourceLabel({
			sourceType: detail.sourceType,
			sourceService: detail.sourceService,
		})
		: null;
	const canRecordTransfer = detail
		? detail.role === "organizer"
			? selectedMember !== null
				&& selectedMemberRemainingAmount > 0
				&& transferAmountValue > 0
				&& transferAmountValue <= selectedMemberRemainingAmount
			: detail.outstandingAmount > 0
				&& transferAmountValue > 0
				&& transferAmountValue <= detail.outstandingAmount
		: false;

	const handleToggleMember = (member: SettlementMember) => {
		startTransition(async () => {
			setPendingMemberId(member.id);
			setError(null);
			try {
				const nextStatus = member.status === "paid" ? "pending" : "paid";
				const result = await updateSettlementMemberStatus(member.id, {
					status: nextStatus,
				});

				if (!result.success) {
					setError(result.error);
					return;
				}

				await loadDetail();
			} catch (updateError) {
				setError(updateError instanceof Error ? updateError.message : "정산 상태를 수정하지 못했습니다.");
			} finally {
				setPendingMemberId(null);
			}
		});
	};

	const handleMemberChange = (memberId: string) => {
		setSelectedMemberId(memberId);

		if (!detail) return;

		const nextMember = detail.members.find((member) => member.id === memberId);
		if (!nextMember) {
			setTransferAmount("");
			return;
		}

		const remainingAmount = Math.max(nextMember.shareAmount - nextMember.paidAmount, 0);
		setTransferAmount(remainingAmount > 0 ? String(remainingAmount) : "");
	};

	const handleRecordTransfer = () => {
		if (!detail || !canRecordTransfer) return;

		startRecordingTransfer(async () => {
			setError(null);
			try {
				const result = await recordSettlementTransfer(detail.id, {
					memberId: detail.role === "organizer" ? selectedMemberId : null,
					accountId: transferAccountId === NO_ACCOUNT ? null : transferAccountId,
					direction: detail.role === "organizer" ? "receive" : "send",
					amount: transferAmountValue,
					memo: transferMemo.trim() || null,
				});

				if (!result.success) {
					setError(result.error);
					return;
				}

				await loadDetail();
			} catch (recordError) {
				setError(recordError instanceof Error ? recordError.message : "정산 이력을 기록하지 못했습니다.");
			}
		});
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>{detail?.title ?? "정산 상세"}</DrawerTitle>
					<DrawerDescription>
						{detail
							? `총액 ${formatCurrency(detail.totalAmount)} · 내 몫 ${formatCurrency(detail.myShareAmount)}`
							: "정산 상세 정보를 불러오는 중입니다."}
					</DrawerDescription>
				</DrawerHeader>

				<div className="max-h-[62vh] space-y-4 overflow-y-auto px-4 pb-2">
					{isLoading && !detail && (
						<div className="rounded-xl border border-border px-4 py-6 text-center text-sm text-muted-foreground">
							<Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
							정산 상세를 불러오는 중입니다.
						</div>
					)}

					{error && (
						<div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
							{error}
						</div>
					)}

					{detail && (
						<>
							<div className="rounded-xl border border-border bg-card/80 p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<Badge variant={detail.status === "completed" ? "default" : "outline"}>
												{getStatusLabel(detail.status)}
											</Badge>
											<Badge variant="secondary">
												{detail.role === "organizer" ? "총무" : "참여자"}
											</Badge>
											{settlementSourceLabel && (
												<Badge variant="outline">
													{settlementSourceLabel}
												</Badge>
											)}
										</div>
										<p className="text-sm text-muted-foreground">
											{detail.role === "organizer" ? "받을 돈" : "보낼 돈"} 기준으로 추적합니다.
										</p>
									</div>
									<div className="text-right">
										<p className="text-xs text-muted-foreground">남은 금액</p>
										<p className="text-base font-semibold">
											{formatCurrency(detail.outstandingAmount)}
										</p>
									</div>
								</div>

								<div className="mt-4 grid grid-cols-3 gap-2 text-center">
									<div className="rounded-lg bg-muted/50 px-2 py-3">
										<p className="text-[11px] text-muted-foreground">총액</p>
										<p className="mt-1 text-sm font-semibold">{formatCurrency(detail.totalAmount)}</p>
									</div>
									<div className="rounded-lg bg-muted/50 px-2 py-3">
										<p className="text-[11px] text-muted-foreground">내 몫</p>
										<p className="mt-1 text-sm font-semibold">{formatCurrency(detail.myShareAmount)}</p>
									</div>
									<div className="rounded-lg bg-muted/50 px-2 py-3">
										<p className="text-[11px] text-muted-foreground">정산됨</p>
										<p className="mt-1 text-sm font-semibold">{formatCurrency(detail.settledAmount)}</p>
									</div>
								</div>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<h3 className="text-sm font-semibold">참여자 상태</h3>
									<p className="text-xs text-muted-foreground">
										{detail.memberCount}명
									</p>
								</div>

								{detail.members.length === 0 ? (
									<div className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
										참여자 상세가 아직 없습니다. 현재는 요약 정보만 추적 중입니다.
									</div>
								) : (
									detail.members.map((member) => {
										const isMemberPending = pendingMemberId === member.id;
										return (
											<div key={member.id} className="rounded-xl border border-border bg-card/70 p-3">
												<div className="flex items-start justify-between gap-3">
													<div>
														<p className="text-sm font-medium">{member.name}</p>
														<p className="mt-1 text-xs text-muted-foreground">
															몫 {formatCurrency(member.shareAmount)}
															{" · "}
															정산 {formatCurrency(member.paidAmount)}
														</p>
													</div>
													<Button
														size="sm"
														variant={member.status === "paid" ? "outline" : "default"}
														className="min-w-24"
														disabled={isPending && isMemberPending}
														onClick={() => handleToggleMember(member)}
													>
														{isPending && isMemberPending ? (
															<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
														) : member.status === "paid" ? (
															<RotateCcw className="mr-1.5 h-3.5 w-3.5" />
														) : (
															<Check className="mr-1.5 h-3.5 w-3.5" />
														)}
														{member.status === "paid" ? "완료 취소" : "완료 처리"}
													</Button>
												</div>
											</div>
										);
									})
								)}
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<h3 className="text-sm font-semibold">정산 이력</h3>
									<p className="text-xs text-muted-foreground">
										{detail.transfers.length}건
									</p>
								</div>

								{detail.transfers.length === 0 ? (
									<div className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
										아직 기록된 정산 이력이 없습니다.
									</div>
								) : (
									detail.transfers.map((transfer) => (
										<div key={transfer.id} className="rounded-xl border border-border bg-card/70 p-3">
											<div className="flex items-start justify-between gap-3">
												<div>
													<p className="text-sm font-medium">
														{transfer.direction === "receive" ? "수금" : "송금"} {formatCurrency(transfer.amount)}
													</p>
													<p className="mt-1 text-xs text-muted-foreground">
														{formatOccurredAt(transfer.occurredAt)}
													</p>
												</div>
												{transfer.memo && (
													<Badge variant="outline" className="max-w-36 truncate">
														{transfer.memo}
													</Badge>
												)}
											</div>
										</div>
									))
								)}
							</div>

							<div className="space-y-3 rounded-xl border border-border bg-card/70 p-4">
								<div className="flex items-center justify-between gap-3">
									<div>
										<h3 className="text-sm font-semibold">
											{detail.role === "organizer" ? "수금 기록 추가" : "송금 기록 추가"}
										</h3>
										<p className="mt-1 text-xs text-muted-foreground">
											{detail.role === "organizer"
												? "총액이 아니라 받은 금액만 기록합니다."
												: "내 정산액만 송금 이력으로 남깁니다."}
										</p>
									</div>
									<Badge variant="outline">
										잔여 {formatCurrency(detail.outstandingAmount)}
									</Badge>
								</div>

								{detail.role === "organizer" && (
									<div className="space-y-1.5">
										<Label className="text-xs">정산 멤버</Label>
										<Select value={selectedMemberId ?? undefined} onValueChange={handleMemberChange}>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="수금할 멤버 선택" />
											</SelectTrigger>
											<SelectContent>
												{detail.members.length > 0 ? (
													<SelectGroup>
														<SelectLabel>참여자</SelectLabel>
														{detail.members.map((member) => (
															<SelectItem key={member.id} value={member.id}>
																{member.name} · 잔여 {formatCurrency(Math.max(member.shareAmount - member.paidAmount, 0))}
															</SelectItem>
														))}
													</SelectGroup>
												) : (
													<SelectItem value="__no_member__" disabled>
														선택 가능한 멤버가 없습니다
													</SelectItem>
												)}
											</SelectContent>
										</Select>
									</div>
								)}

								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
									<div className="space-y-1.5">
										<Label className="text-xs">금액</Label>
										<Input
											type="text"
											inputMode="numeric"
											value={formatCurrencyInput(transferAmount)}
											onChange={(e) => setTransferAmount(parseCurrencyInput(e.target.value))}
											placeholder="0"
										/>
									</div>
									<div className="space-y-1.5">
										<Label className="text-xs">계좌 (선택사항)</Label>
										<Select value={transferAccountId} onValueChange={setTransferAccountId}>
											<SelectTrigger className="w-full">
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
								</div>

								<div className="space-y-1.5">
									<Label className="text-xs">메모 (선택사항)</Label>
									<Input
										value={transferMemo}
										onChange={(e) => setTransferMemo(e.target.value)}
										placeholder={detail.role === "organizer" ? "예: 현금으로 받음" : "예: 카카오페이 송금"}
									/>
								</div>

								{detail.role === "organizer" && selectedMember && (
									<p className="text-xs text-muted-foreground">
										{selectedMember.name} 잔여 금액은 {formatCurrency(selectedMemberRemainingAmount)}입니다.
									</p>
								)}

								<Button
									type="button"
									disabled={!canRecordTransfer || isRecordingTransfer}
									onClick={handleRecordTransfer}
								>
									{isRecordingTransfer ? (
										<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
									) : null}
									{detail.role === "organizer" ? "수금 기록" : "송금 기록"}
								</Button>
							</div>
						</>
					)}
				</div>

				<DrawerFooter>
					<div className="flex gap-2">
						<Button variant="outline" className="flex-1" asChild>
							<Link href={transactionHref} onClick={() => onOpenChange(false)}>
								<ExternalLink className="mr-1.5 h-4 w-4" />
								거래 보기
							</Link>
						</Button>
						<Button className="flex-1" onClick={() => onOpenChange(false)}>
							닫기
						</Button>
					</div>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
