import type {
	ParsedSettlementTransfer,
	ParsedSettlementTransferCandidate,
} from "../llm/types";

export interface PendingSettlementContext {
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

interface ScoredTransferCandidate {
	score: number;
	candidate: ParsedSettlementTransferCandidate;
}

function normalizeKeyword(value: string | null | undefined): string {
	return (value ?? "").trim().replace(/\s+/g, "").toLowerCase();
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
): ScoredTransferCandidate[] {
	const keyword = normalizeKeyword(draft.counterpartyName ?? draft.memo);
	const results: ScoredTransferCandidate[] = [];

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
): ScoredTransferCandidate[] {
	const keyword = normalizeKeyword(draft.counterpartyName ?? draft.memo);
	const results: ScoredTransferCandidate[] = [];

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
	candidates: ScoredTransferCandidate[],
): ParsedSettlementTransfer {
	const topCandidates = candidates.slice(0, 5).map((item) => item.candidate);
	const best = candidates[0];
	const second = candidates[1];
	const isConfident = Boolean(
		best
		&& best.score >= 60
		&& (!second || best.score - second.score >= 15),
	);

	return {
		...draft,
		candidates: topCandidates,
		matchedSettlementId: isConfident ? best?.candidate.settlementId ?? null : null,
		matchedSettlementTitle: isConfident ? best?.candidate.settlementTitle ?? null : null,
		matchedMemberId: isConfident ? best?.candidate.memberId ?? null : null,
		matchedMemberName: isConfident ? best?.candidate.memberName ?? null : null,
	};
}

export function resolveSettlementTransferMatches(
	drafts: ParsedSettlementTransfer[],
	pendingSettlements: PendingSettlementContext[],
): ParsedSettlementTransfer[] {
	if (drafts.length === 0) return [];

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
