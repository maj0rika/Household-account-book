"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, Clock3, HandCoins, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SettlementDetailSheet } from "@/components/settlement/SettlementDetailSheet";
import { formatCurrency } from "@/lib/format";
import type { SettlementDetail, SettlementSummary, Account } from "@/types";

type SettlementFilter = "all" | "receivable" | "payable" | "completed";

const FILTERS: Array<{ key: SettlementFilter; label: string }> = [
	{ key: "all", label: "전체" },
	{ key: "receivable", label: "받을 돈" },
	{ key: "payable", label: "보낼 돈" },
	{ key: "completed", label: "완료" },
];

function getStatusLabel(status: SettlementSummary["status"]): string {
	if (status === "completed") return "완료";
	if (status === "partial") return "진행중";
	return "대기";
}

function getDisplayDate(date: Date): string {
	return new Intl.DateTimeFormat("ko-KR", {
		month: "numeric",
		day: "numeric",
	}).format(date);
}

interface SettlementBoardProps {
	initialSettlements: SettlementSummary[];
	accounts: Account[];
	month: string;
	initialOpenSettlementId?: string | null;
}

export function SettlementBoard({
	initialSettlements,
	accounts,
	month,
	initialOpenSettlementId = null,
}: SettlementBoardProps) {
	const [filter, setFilter] = useState<SettlementFilter>("all");
	const [settlements, setSettlements] = useState(initialSettlements);
	const [activeSettlementId, setActiveSettlementId] = useState<string | null>(initialOpenSettlementId);
	const [detailOpen, setDetailOpen] = useState(Boolean(initialOpenSettlementId));

	useEffect(() => {
		setSettlements(initialSettlements);
	}, [initialSettlements]);

	useEffect(() => {
		if (!initialOpenSettlementId) return;
		setActiveSettlementId(initialOpenSettlementId);
		setDetailOpen(true);
	}, [initialOpenSettlementId]);

	const filteredSettlements = useMemo(() => {
		if (filter === "completed") {
			return settlements.filter((settlement) => settlement.status === "completed");
		}
		if (filter === "receivable") {
			return settlements.filter((settlement) => settlement.role === "organizer" && settlement.status !== "completed");
		}
		if (filter === "payable") {
			return settlements.filter((settlement) => settlement.role === "participant" && settlement.status !== "completed");
		}
		return settlements;
	}, [filter, settlements]);

	const handleUpdated = (detail: SettlementDetail) => {
		setSettlements((prev) =>
			prev.map((settlement) =>
				settlement.id === detail.id
					? {
						...settlement,
						status: detail.status,
						outstandingAmount: detail.outstandingAmount,
						settledAmount: detail.settledAmount,
						updatedAt: detail.updatedAt,
						memberCount: detail.memberCount,
					}
					: settlement,
			),
		);
	};

	return (
		<>
			<div className="space-y-3 px-4 pb-28 pt-4 md:pb-10">
				<div className="flex flex-wrap gap-2">
					{FILTERS.map((item) => (
						<Button
							key={item.key}
							size="sm"
							variant={filter === item.key ? "default" : "outline"}
							className="h-8 rounded-full px-3 text-xs"
							onClick={() => setFilter(item.key)}
						>
							{item.label}
						</Button>
					))}
				</div>

				{filteredSettlements.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
						<p className="text-sm font-medium">표시할 정산이 없습니다</p>
						<p className="mt-1 text-xs text-muted-foreground">
							거래 입력에서 정산 포함 항목을 저장하면 여기에서 추적할 수 있습니다.
						</p>
					</div>
				) : (
					filteredSettlements.map((settlement) => (
						<button
							key={settlement.id}
							type="button"
							className="block w-full text-left"
							onClick={() => {
								setActiveSettlementId(settlement.id);
								setDetailOpen(true);
							}}
						>
							<Card className="gap-0 py-0">
								<CardContent className="space-y-3 p-4">
									<div className="flex items-start justify-between gap-3">
										<div>
											<div className="flex items-center gap-2">
												<Badge variant={settlement.status === "completed" ? "default" : "outline"}>
													{getStatusLabel(settlement.status)}
												</Badge>
												<Badge variant="secondary">
													{settlement.role === "organizer" ? "총무" : "참여자"}
												</Badge>
											</div>
											<p className="mt-2 text-base font-semibold">{settlement.title}</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{getDisplayDate(settlement.createdAt)}
												{" · "}
												총 {settlement.participantCount}명
												{" · "}
												내 몫 {formatCurrency(settlement.myShareAmount)}
											</p>
										</div>
										<div className="flex items-center gap-1 text-muted-foreground">
											<ChevronRight className="h-4 w-4" />
										</div>
									</div>

									<div className="grid grid-cols-3 gap-2">
										<div className="rounded-xl bg-muted/50 px-3 py-3">
											<div className="flex items-center gap-1 text-[11px] text-muted-foreground">
												<Clock3 className="h-3.5 w-3.5" />
												남은 금액
											</div>
											<p className="mt-1 text-sm font-semibold">
												{formatCurrency(settlement.outstandingAmount)}
											</p>
										</div>
										<div className="rounded-xl bg-muted/50 px-3 py-3">
											<div className="flex items-center gap-1 text-[11px] text-muted-foreground">
												{settlement.role === "organizer" ? (
													<HandCoins className="h-3.5 w-3.5" />
												) : (
													<Send className="h-3.5 w-3.5" />
												)}
												{settlement.role === "organizer" ? "받을 돈" : "보낼 돈"}
											</div>
											<p className="mt-1 text-sm font-semibold">
												{formatCurrency(
													settlement.role === "organizer"
														? Math.max(settlement.totalAmount - settlement.myShareAmount, 0)
														: settlement.myShareAmount,
												)}
											</p>
										</div>
										<div className="rounded-xl bg-muted/50 px-3 py-3">
											<div className="flex items-center gap-1 text-[11px] text-muted-foreground">
												<CheckCircle2 className="h-3.5 w-3.5" />
												정산됨
											</div>
											<p className="mt-1 text-sm font-semibold">
												{formatCurrency(settlement.settledAmount)}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</button>
					))
				)}
			</div>

			<SettlementDetailSheet
				open={detailOpen}
				onOpenChange={setDetailOpen}
				settlementId={activeSettlementId}
				accounts={accounts}
				month={month}
				onUpdated={handleUpdated}
			/>
		</>
	);
}
