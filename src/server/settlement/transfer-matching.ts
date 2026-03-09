import { and, desc, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/server/db";
import {
	settlementMembers,
	settlements,
	settlementTransfers,
} from "@/server/db/schema";
import { calculateSettlementProgress } from "@/server/settlement/utils";
import type {
	ParsedSettlementTransfer,
	ParsedSettlementTransferCandidate,
} from "@/server/llm/types";

interface PendingSettlementContext {
	id: string;
	title: string;
	role: "organizer" | "participant";
	totalAmount: number;
	myShareAmount: number;
	sourceService: "kakao" | "toss" | "unknown";
	createdAt: Date;
	outstandingAmount: number;
	members: Array<{
		id: string;
		name: string;
		remainingAmount: number;
	}>;
}

function normalizeKeyword(value: string | null | undefined): string {
	return (value ?? "").trim().replace(/\s+/g, "").toLowerCase();
}

function normalizeSourceService(value: string): "kakao" | "toss" | "unknown" {
	if (value === "kakao" || value === "toss") return value;
	return "unknown";
}

function buildMemberCandidate(
	settlement: PendingSettlementContext,
	member: PendingSettlementContext["members"][number],
): ParsedSettlementTransferCandidate {
	return {
		settlementId: settlement.id,
		settlementTitle: settlement.title,
		settlementRole: settlement.role,
		memberId: member.id,
		memberName: member.name,
		outstandingAmount: member.remainingAmount,
	};
}

function buildSettlementCandidate(
	settlement: PendingSettlementContext,
): ParsedSettlementTransferCandidate {
	return {
		settlementId: settlement.id,
		settlementTitle: settlement.title,
		settlementRole: settlement.role,
		outstandingAmount: settlement.outstandingAmount,
	};
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

	return settlementRows.map((settlement) => {
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
	}).filter((settlement) => settlement.outstandingAmount > 0);
}

function scoreSettlementTitle(settlementTitle: string, keyword: string): number {
	if (!keyword) return 0;

	const normalizedTitle = normalizeKeyword(settlementTitle);
	if (!normalizedTitle) return 0;
	if (normalizedTitle === keyword) return 20;
	if (normalizedTitle.includes(keyword) || keyword.includes(normalizedTitle)) return 12;
	return 0;
}

function resolveReceiveCandidates(
	draft: ParsedSettlementTransfer,
	pendingSettlements: PendingSettlementContext[],
): Array<{ score: number; candidate: ParsedSettlementTransferCandidate }> {
	const keyword = normalizeKeyword(draft.counterpartyName ?? draft.memo);
	const results: Array<{ score: number; candidate: ParsedSettlementTransferCandidate }> = [];

	for (const settlement of pendingSettlements) {
		if (settlement.role !== "organizer") continue;

		for (const member of settlement.members) {
			if (member.remainingAmount < draft.amount) continue;

			let score = 20;

			if (member.remainingAmount === draft.amount) {
				score += 40;
			}

			if (keyword) {
				const normalizedMemberName = normalizeKeyword(member.name);
				if (normalizedMemberName === keyword) {
					score += 80;
				} else if (
					normalizedMemberName.includes(keyword)
					|| keyword.includes(normalizedMemberName)
				) {
					score += 50;
				}
				score += scoreSettlementTitle(settlement.title, keyword);
			}

			if (draft.sourceService && draft.sourceService !== "unknown" && settlement.sourceService === draft.sourceService) {
				score += 10;
			}

			results.push({
				score,
				candidate: buildMemberCandidate(settlement, member),
			});
		}
	}

	return results.sort((a, b) => b.score - a.score);
}

function resolveSendCandidates(
	draft: ParsedSettlementTransfer,
	pendingSettlements: PendingSettlementContext[],
): Array<{ score: number; candidate: ParsedSettlementTransferCandidate }> {
	const keyword = normalizeKeyword(draft.counterpartyName ?? draft.memo);
	const results: Array<{ score: number; candidate: ParsedSettlementTransferCandidate }> = [];

	for (const settlement of pendingSettlements) {
		if (settlement.role !== "participant") continue;
		if (settlement.outstandingAmount < draft.amount) continue;

		let score = 20;

		if (settlement.outstandingAmount === draft.amount) {
			score += 50;
		}

		if (keyword) {
			score += scoreSettlementTitle(settlement.title, keyword);
		}

		if (draft.sourceService && draft.sourceService !== "unknown" && settlement.sourceService === draft.sourceService) {
			score += 10;
		}

		results.push({
			score,
			candidate: buildSettlementCandidate(settlement),
		});
	}

	return results.sort((a, b) => b.score - a.score);
}

function enrichDraftWithMatches(
	draft: ParsedSettlementTransfer,
	candidates: Array<{ score: number; candidate: ParsedSettlementTransferCandidate }>,
): ParsedSettlementTransfer {
	const topCandidates = candidates.slice(0, 5).map((item) => item.candidate);
	const best = candidates[0];
	const second = candidates[1];
	const isConfident = best
		&& best.score >= 60
		&& (!second || best.score - second.score >= 15);

	return {
		...draft,
		candidates: topCandidates,
		matchedSettlementId: isConfident ? best.candidate.settlementId : null,
		matchedSettlementTitle: isConfident ? best.candidate.settlementTitle : null,
		matchedMemberId: isConfident ? best.candidate.memberId ?? null : null,
		matchedMemberName: isConfident ? best.candidate.memberName ?? null : null,
	};
}

export async function matchParsedSettlementTransfers(
	userId: string,
	drafts: ParsedSettlementTransfer[],
): Promise<ParsedSettlementTransfer[]> {
	if (drafts.length === 0) return [];

	const pendingSettlements = await loadPendingSettlements(userId);
	if (pendingSettlements.length === 0) {
		return drafts.map((draft) => ({
			...draft,
			candidates: [],
			matchedSettlementId: null,
			matchedSettlementTitle: null,
			matchedMemberId: null,
			matchedMemberName: null,
		}));
	}

	return drafts.map((draft) => {
		const candidates = draft.direction === "receive"
			? resolveReceiveCandidates(draft, pendingSettlements)
			: resolveSendCandidates(draft, pendingSettlements);

		return enrichDraftWithMatches(draft, candidates);
	});
}
