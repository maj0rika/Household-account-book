"use client";

import Link from "next/link";
import { ChevronRight, CircleDollarSign, HandCoins, Send } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { SettlementDigest } from "@/types";

interface SettlementDigestCardProps {
	digest: SettlementDigest;
	month: string;
	href?: string | null;
}

export function SettlementDigestCard({
	digest,
	month,
	href = "/settlements",
}: SettlementDigestCardProps) {
	const hasAnySettlement = digest.pendingCount > 0
		|| digest.completedCount > 0
		|| digest.receivableAmount > 0
		|| digest.payableAmount > 0;

	if (!hasAnySettlement) {
		return null;
	}

	const linkHref = href
		? `${href}?month=${month}`
		: null;

	const content = (
		<Card className="overflow-hidden gap-0 py-0">
			<CardContent className="space-y-3 p-4">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-sm font-semibold">정산 현황</p>
						<p className="mt-1 text-xs text-muted-foreground">
							가계부에는 내 몫만 집계되고, 정산은 별도로 추적합니다.
						</p>
					</div>
					{linkHref && (
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							자세히
							<ChevronRight className="h-3.5 w-3.5" />
						</div>
					)}
				</div>

				<div className="grid grid-cols-3 gap-2">
					<div className="rounded-xl border border-border/70 bg-background/70 p-3">
						<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
							<HandCoins className="h-3.5 w-3.5 text-primary" />
							받을 돈
						</div>
						<p className="mt-2 text-sm font-semibold text-foreground">
							{formatCurrency(digest.receivableAmount)}
						</p>
					</div>
					<div className="rounded-xl border border-border/70 bg-background/70 p-3">
						<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
							<Send className="h-3.5 w-3.5 text-muted-foreground" />
							보낼 돈
						</div>
						<p className="mt-2 text-sm font-semibold text-foreground">
							{formatCurrency(digest.payableAmount)}
						</p>
					</div>
					<div className="rounded-xl border border-border/70 bg-background/70 p-3">
						<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
							<CircleDollarSign className="h-3.5 w-3.5 text-income" />
							진행중
						</div>
						<p className="mt-2 text-sm font-semibold text-foreground">
							{digest.pendingCount}건
						</p>
						<p className="mt-1 text-[11px] text-muted-foreground">
							완료 {digest.completedCount}건
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);

	if (!linkHref) {
		return <div className="px-4 pt-2">{content}</div>;
	}

	return (
		<div className="px-4 pt-2">
			<Link href={linkHref} className="block">
				{content}
			</Link>
		</div>
	);
}
