"use client";

import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/lib/format";
import { getSettlementSourceLabel } from "@/lib/settlement";
import type { ParsedTransaction } from "@/server/llm/types";

function hasPositiveNumber(value: number | null | undefined): value is number {
	return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function getRole(item: ParsedTransaction): "organizer" | "participant" {
	return item.settlementRole === "participant" ? "participant" : "organizer";
}

function getMyShareAmount(item: ParsedTransaction): number {
	return hasPositiveNumber(item.myShareAmount) ? item.myShareAmount : item.amount;
}

function getTotalAmount(item: ParsedTransaction): number {
	const myShareAmount = getMyShareAmount(item);
	if (hasPositiveNumber(item.settlementTotalAmount)) {
		return Math.max(item.settlementTotalAmount, myShareAmount);
	}
	return myShareAmount;
}

function getParticipantCount(item: ParsedTransaction): number {
	const role = getRole(item);
	const memberCount = item.settlementMembers?.length ?? 0;
	if (hasPositiveNumber(item.participantCount)) {
		return Math.max(role === "organizer" ? 2 : 1, Math.trunc(item.participantCount));
	}
	return role === "organizer" ? Math.max(2, memberCount + 1) : 1;
}

function getOutstandingAmount(item: ParsedTransaction): number {
	const role = getRole(item);
	const totalAmount = getTotalAmount(item);
	const myShareAmount = getMyShareAmount(item);

	return role === "organizer"
		? Math.max(totalAmount - myShareAmount, 0)
		: myShareAmount;
}

interface SettlementDraftEditorProps {
	item: ParsedTransaction;
	enabled: boolean;
	onEnabledChange: (enabled: boolean) => void;
	onChange: (next: ParsedTransaction) => void;
}

export function SettlementDraftEditor({
	item,
	enabled,
	onEnabledChange,
	onChange,
}: SettlementDraftEditorProps) {
	const role = getRole(item);
	const totalAmount = getTotalAmount(item);
	const myShareAmount = getMyShareAmount(item);
	const participantCount = getParticipantCount(item);
	const outstandingAmount = getOutstandingAmount(item);
	const equalShareAmount = participantCount > 0
		? Math.round(totalAmount / participantCount)
		: myShareAmount;
	const sourceBadge = getSettlementSourceLabel({
		sourceType: item.settlementSourceType,
		sourceService: item.settlementSourceService,
	});
	const members = item.settlementMembers ?? [];

	const ensureEnabledDraft = (checked: boolean) => {
		onEnabledChange(checked);
		if (!checked) return;

		onChange({
			...item,
			isSettlement: true,
			settlementRole: role,
			settlementTotalAmount: totalAmount,
			myShareAmount,
			participantCount,
			settlementStatus: item.settlementStatus ?? "pending",
			settlementSourceType: item.settlementSourceType ?? "manual",
			settlementSourceService: item.settlementSourceService ?? "unknown",
			settlementMembers: item.settlementMembers ?? [],
		});
	};

	const updateMembers = (nextMembers: NonNullable<ParsedTransaction["settlementMembers"]>) => {
		onChange({
			...item,
			isSettlement: true,
			settlementMembers: nextMembers,
		});
	};

	return (
		<div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
			<div className="flex items-center justify-between gap-3">
				<div>
					<div className="flex items-center gap-2">
						<Label htmlFor={`settlement-toggle-${item.description}`} className="text-sm font-medium">
							정산 추적
						</Label>
						{sourceBadge && (
							<Badge variant="outline" className="text-[10px]">
								{sourceBadge}
							</Badge>
						)}
					</div>
					<p className="mt-1 text-xs text-muted-foreground">
						가계부에는 {formatCurrency(myShareAmount)}만 저장되고, 정산은 별도로 추적됩니다.
					</p>
				</div>
				<Switch
					id={`settlement-toggle-${item.description}`}
					checked={enabled}
					onCheckedChange={ensureEnabledDraft}
				/>
			</div>

			{!enabled && (
				<p className="mt-3 text-xs text-muted-foreground">
					정산 초안은 유지하지만 저장 시에는 일반 거래로만 기록합니다.
				</p>
			)}

			{enabled && (
				<div className="mt-4 space-y-3">
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1">
							<Label className="text-xs">역할</Label>
							<Select
								value={role}
								onValueChange={(value) =>
									onChange({
										...item,
										isSettlement: true,
										settlementRole: value as "organizer" | "participant",
										participantCount: value === "organizer"
											? Math.max(participantCount, 2)
											: 1,
									})
								}
							>
								<SelectTrigger className="h-8 text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="organizer">총무</SelectItem>
									<SelectItem value="participant">참여자</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label className="text-xs">인원</Label>
							<Input
								type="number"
								min={role === "organizer" ? 2 : 1}
								value={participantCount}
								onChange={(e) =>
									onChange({
										...item,
										isSettlement: true,
										participantCount: Math.max(
											role === "organizer" ? 2 : 1,
											Number(e.target.value) || (role === "organizer" ? 2 : 1),
										),
									})
								}
								className="h-8 text-sm"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1">
							<Label className="text-xs">총액</Label>
							<Input
								type="text"
								inputMode="numeric"
								value={formatCurrencyInput(String(totalAmount))}
								onChange={(e) => {
									const nextAmount = Number(parseCurrencyInput(e.target.value)) || 0;
									onChange({
										...item,
										isSettlement: true,
										settlementTotalAmount: Math.max(nextAmount, myShareAmount),
									});
								}}
								className="h-8 text-sm"
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs">내 몫</Label>
							<Input
								type="text"
								inputMode="numeric"
								value={formatCurrencyInput(String(myShareAmount))}
								onChange={(e) => {
									const nextAmount = Number(parseCurrencyInput(e.target.value)) || 0;
									onChange({
										...item,
										amount: nextAmount,
										isSettlement: true,
										myShareAmount: nextAmount,
										settlementTotalAmount: Math.max(totalAmount, nextAmount),
									});
								}}
								className="h-8 text-sm"
							/>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-2">
						<div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
							<p className="text-[11px] text-muted-foreground">1인당 예상</p>
							<p className="mt-1 text-sm font-semibold">{formatCurrency(equalShareAmount)}</p>
						</div>
						<div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
							<p className="text-[11px] text-muted-foreground">
								{role === "organizer" ? "받을 돈" : "보낼 돈"}
							</p>
							<p className="mt-1 text-sm font-semibold">{formatCurrency(outstandingAmount)}</p>
						</div>
						<div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
							<p className="text-[11px] text-muted-foreground">거래 기록</p>
							<p className="mt-1 text-sm font-semibold">{formatCurrency(myShareAmount)}</p>
						</div>
					</div>

					{(role === "organizer" || members.length > 0) && (
						<div className="space-y-2 rounded-lg border border-border/70 bg-background/70 p-3">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-medium">참여자 상세</p>
									<p className="mt-1 text-[11px] text-muted-foreground">
										저장 전에 이름, 몫, 완료 상태를 보정할 수 있습니다.
									</p>
								</div>
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="h-7 gap-1 text-xs"
									onClick={() =>
										updateMembers([
											...members,
											{
												name: "",
												shareAmount: equalShareAmount,
												status: "pending",
											},
										])
									}
								>
									<Plus className="h-3.5 w-3.5" />
									추가
								</Button>
							</div>

							<div className="space-y-2">
								{members.length === 0 && (
									<p className="text-[11px] text-muted-foreground">
										멤버를 입력하지 않아도 저장할 수 있습니다. 필요하면 나중에 상세 화면에서 계속 추적합니다.
									</p>
								)}
								{members.map((member, index) => (
									<div key={`${member.name}-${index}`} className="grid grid-cols-[1.3fr_1fr_0.9fr_auto] gap-2">
										<Input
											value={member.name}
											onChange={(e) =>
												updateMembers(
													members.map((current, currentIndex) =>
														currentIndex === index
															? { ...current, name: e.target.value }
															: current,
													),
												)
											}
											placeholder="이름"
											className="h-8 text-sm"
										/>
										<Input
											type="text"
											inputMode="numeric"
											value={formatCurrencyInput(String(member.shareAmount))}
											onChange={(e) => {
												const nextShareAmount = Number(parseCurrencyInput(e.target.value)) || 0;
												updateMembers(
													members.map((current, currentIndex) =>
														currentIndex === index
															? {
																...current,
																shareAmount: nextShareAmount,
																paidAmount: current.status === "paid"
																	? nextShareAmount
																	: current.paidAmount,
															}
															: current,
													),
												);
											}}
											className="h-8 text-sm"
										/>
										<Select
											value={member.status ?? "pending"}
											onValueChange={(value) =>
												updateMembers(
													members.map((current, currentIndex) =>
														currentIndex === index
															? {
																...current,
																status: value as "pending" | "partial" | "paid",
																paidAmount: value === "paid"
																	? current.shareAmount
																	: value === "pending"
																		? 0
																		: current.paidAmount,
															}
															: current,
													),
												)
											}
										>
											<SelectTrigger className="h-8 text-sm">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="pending">대기</SelectItem>
												<SelectItem value="partial">부분</SelectItem>
												<SelectItem value="paid">완료</SelectItem>
											</SelectContent>
										</Select>
										<Button
											type="button"
											size="icon"
											variant="ghost"
											className="h-8 w-8 shrink-0"
											onClick={() => updateMembers(members.filter((_, currentIndex) => currentIndex !== index))}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
