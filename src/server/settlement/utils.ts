import type { ParsedSettlementMember, ParsedTransaction } from "@/server/llm/types";
import type { SettlementRole, SettlementStatus, SettlementTransferDirection } from "@/types";

export interface NormalizedSettlementMemberDraft {
	name: string;
	shareAmount: number;
	status: "pending" | "partial" | "paid";
	paidAmount: number;
}

export interface NormalizedSettlementDraft {
	title: string;
	role: SettlementRole;
	totalAmount: number;
	myShareAmount: number;
	participantCount: number;
	status: SettlementStatus;
	sourceType: "text" | "image" | "manual";
	sourceService: "kakao" | "toss" | "unknown";
	members: NormalizedSettlementMemberDraft[];
}

interface SettlementProgressMemberLike {
	shareAmount: number;
	paidAmount: number;
}

interface SettlementProgressTransferLike {
	direction: SettlementTransferDirection;
	amount: number;
}

interface SettlementProgressInput {
	role: SettlementRole;
	totalAmount: number;
	myShareAmount: number;
	members: SettlementProgressMemberLike[];
	transfers: SettlementProgressTransferLike[];
}

export interface SettlementProgress {
	targetAmount: number;
	settledAmount: number;
	outstandingAmount: number;
	status: SettlementStatus;
}

function isPositiveNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeMemberStatus(status: ParsedSettlementMember["status"]): "pending" | "partial" | "paid" {
	if (status === "partial" || status === "paid") return status;
	return "pending";
}

function normalizeSettlementStatus(status: ParsedTransaction["settlementStatus"]): SettlementStatus | null {
	if (status === "pending" || status === "partial" || status === "completed") return status;
	return null;
}

function normalizeMembers(members: ParsedTransaction["settlementMembers"]): NormalizedSettlementMemberDraft[] {
	if (!Array.isArray(members)) return [];

	return members
		.map((member) => {
			const name = typeof member.name === "string" ? member.name.trim() : "";
			if (!name || !isPositiveNumber(member.shareAmount)) {
				return null;
			}

			const paidAmount = isPositiveNumber(member.paidAmount) ? Math.min(member.paidAmount, member.shareAmount) : 0;

			return {
				name,
				shareAmount: member.shareAmount,
				status: normalizeMemberStatus(member.status),
				paidAmount,
			};
		})
		.filter((member): member is NormalizedSettlementMemberDraft => member !== null);
}

function deriveSettlementStatus(
	explicitStatus: ParsedTransaction["settlementStatus"],
	members: NormalizedSettlementMemberDraft[],
	role: SettlementRole,
	totalAmount: number,
	myShareAmount: number,
): SettlementStatus {
	const normalizedExplicitStatus = normalizeSettlementStatus(explicitStatus);
	if (normalizedExplicitStatus) return normalizedExplicitStatus;

	if (members.length === 0) {
		if (role === "organizer" && totalAmount > myShareAmount) {
			return "pending";
		}
		return "completed";
	}

	const outstandingMembers = members.filter((member) => member.paidAmount < member.shareAmount);
	if (outstandingMembers.length === 0) return "completed";
	if (outstandingMembers.length === members.length) return "pending";
	return "partial";
}

export function calculateSettlementProgress(input: SettlementProgressInput): SettlementProgress {
	const targetAmount = input.role === "organizer"
		? Math.max(input.totalAmount - input.myShareAmount, 0)
		: Math.max(input.myShareAmount, 0);

	const settledFromMembers = input.members.reduce(
		(sum, member) => sum + Math.min(Math.max(member.paidAmount, 0), member.shareAmount),
		0,
	);
	const settledFromReceives = input.transfers.reduce((sum, transfer) => {
		if (transfer.direction !== "receive") return sum;
		return sum + Math.max(transfer.amount, 0);
	}, 0);
	const settledFromSends = input.transfers.reduce((sum, transfer) => {
		if (transfer.direction !== "send") return sum;
		return sum + Math.max(transfer.amount, 0);
	}, 0);

	const rawSettledAmount = input.role === "organizer"
		? Math.max(settledFromMembers, settledFromReceives)
		: settledFromSends;
	const settledAmount = Math.min(rawSettledAmount, targetAmount);
	const outstandingAmount = Math.max(targetAmount - settledAmount, 0);

	if (targetAmount === 0) {
		return {
			targetAmount,
			settledAmount: 0,
			outstandingAmount: 0,
			status: "completed",
		};
	}

	if (settledAmount === 0) {
		return {
			targetAmount,
			settledAmount,
			outstandingAmount,
			status: "pending",
		};
	}

	if (outstandingAmount === 0) {
		return {
			targetAmount,
			settledAmount,
			outstandingAmount,
			status: "completed",
		};
	}

	return {
		targetAmount,
		settledAmount,
		outstandingAmount,
		status: "partial",
	};
}

export function hasSettlementDraft(item: ParsedTransaction): boolean {
	return item.isSettlement === true
		|| item.settlementRole === "organizer"
		|| item.settlementRole === "participant"
		|| isPositiveNumber(item.settlementTotalAmount)
		|| Array.isArray(item.settlementMembers);
}

export function normalizeSettlementDraft(item: ParsedTransaction): NormalizedSettlementDraft | null {
	if (!hasSettlementDraft(item)) return null;

	const role: SettlementRole = item.settlementRole === "participant" ? "participant" : "organizer";
	const myShareAmount = isPositiveNumber(item.myShareAmount) ? item.myShareAmount : item.amount;
	const totalAmountCandidate = isPositiveNumber(item.settlementTotalAmount) ? item.settlementTotalAmount : myShareAmount;
	const totalAmount = Math.max(totalAmountCandidate, myShareAmount);
	const members = normalizeMembers(item.settlementMembers);

	const participantCount = isPositiveNumber(item.participantCount)
		? Math.max(1, Math.trunc(item.participantCount))
		: Math.max(role === "organizer" ? members.length + 1 : 1, 1);

	return {
		title: item.description.trim() || item.category,
		role,
		totalAmount,
		myShareAmount,
		participantCount,
		status: deriveSettlementStatus(item.settlementStatus, members, role, totalAmount, myShareAmount),
		sourceType: item.settlementSourceType === "image" ? "image" : item.settlementSourceType === "manual" ? "manual" : "text",
		sourceService: item.settlementSourceService === "kakao"
			? "kakao"
			: item.settlementSourceService === "toss"
				? "toss"
				: "unknown",
		members,
	};
}

export function resolveAccountImpactAmount(item: ParsedTransaction): number {
	if (isPositiveNumber(item.accountImpactAmount)) {
		return item.accountImpactAmount;
	}

	const settlement = normalizeSettlementDraft(item);
	if (settlement?.role === "organizer") {
		return settlement.totalAmount;
	}

	return item.amount;
}
