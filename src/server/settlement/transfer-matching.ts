import { and, desc, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/server/db";
import {
	settlementMembers,
	settlements,
	settlementTransfers,
} from "@/server/db/schema";
import type { ParsedSettlementTransfer } from "@/server/llm/types";
import { calculateSettlementProgress } from "@/server/settlement/utils";

import {
	resolveSettlementTransferMatches,
	type PendingSettlementContext,
} from "./transfer-matching-core";

function normalizeSourceService(value: string): "kakao" | "toss" | "unknown" {
	if (value === "kakao" || value === "toss") return value;
	return "unknown";
}

async function loadPendingSettlements(userId: string): Promise<PendingSettlementContext[]> {
	const settlementRows = await db
		.select({
			id: settlements.id,
			title: settlements.title,
			role: settlements.role,
			totalAmount: settlements.totalAmount,
			myShareAmount: settlements.myShareAmount,
			sourceService: settlements.sourceService,
			createdAt: settlements.createdAt,
		})
		.from(settlements)
		.where(and(eq(settlements.userId, userId), ne(settlements.status, "completed")))
		.orderBy(desc(settlements.createdAt));

	if (settlementRows.length === 0) return [];

	const settlementIds = settlementRows.map((row) => row.id);
	const memberRows = await db
		.select({
			id: settlementMembers.id,
			settlementId: settlementMembers.settlementId,
			name: settlementMembers.name,
			shareAmount: settlementMembers.shareAmount,
			paidAmount: settlementMembers.paidAmount,
		})
		.from(settlementMembers)
		.where(inArray(settlementMembers.settlementId, settlementIds));
	const transferRows = await db
		.select({
			settlementId: settlementTransfers.settlementId,
			direction: settlementTransfers.direction,
			amount: settlementTransfers.amount,
		})
		.from(settlementTransfers)
		.where(inArray(settlementTransfers.settlementId, settlementIds));

	const membersBySettlement = new Map<string, typeof memberRows>();
	for (const member of memberRows) {
		const list = membersBySettlement.get(member.settlementId) ?? [];
		list.push(member);
		membersBySettlement.set(member.settlementId, list);
	}

	const transfersBySettlement = new Map<string, typeof transferRows>();
	for (const transfer of transferRows) {
		const list = transfersBySettlement.get(transfer.settlementId) ?? [];
		list.push(transfer);
		transfersBySettlement.set(transfer.settlementId, list);
	}

	return settlementRows
		.map((settlement) => {
			const members = membersBySettlement.get(settlement.id) ?? [];
			const transfers = transfersBySettlement.get(settlement.id) ?? [];
			const progress = calculateSettlementProgress({
				role: settlement.role,
				totalAmount: settlement.totalAmount,
				myShareAmount: settlement.myShareAmount,
				members,
				transfers,
			});

			return {
				id: settlement.id,
				title: settlement.title,
				role: settlement.role,
				totalAmount: settlement.totalAmount,
				myShareAmount: settlement.myShareAmount,
				sourceService: normalizeSourceService(settlement.sourceService),
				createdAt: settlement.createdAt,
				outstandingAmount: progress.outstandingAmount,
				members: members
					.map((member) => ({
						id: member.id,
						name: member.name,
						remainingAmount: Math.max(member.shareAmount - member.paidAmount, 0),
					}))
					.filter((member) => member.remainingAmount > 0),
			};
		})
		.filter((settlement) => settlement.outstandingAmount > 0);
}

export async function matchParsedSettlementTransfers(
	userId: string,
	drafts: ParsedSettlementTransfer[],
): Promise<ParsedSettlementTransfer[]> {
	if (drafts.length === 0) return [];

	const pendingSettlements = await loadPendingSettlements(userId);
	return resolveSettlementTransferMatches(drafts, pendingSettlements);
}
