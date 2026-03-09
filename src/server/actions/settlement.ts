"use server";

import { headers } from "next/headers";
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import {
	settlementMembers,
	settlements,
	settlementTransfers,
	transactions,
} from "@/server/db/schema";
import { applyAccountDelta } from "@/server/account-balance";
import { decryptNullable, encryptNullable } from "@/server/lib/crypto";
import { revalidateSettlementPages } from "@/lib/cache-keys";
import { calculateSettlementProgress } from "@/server/settlement/utils";
import type {
	SettlementDetail,
	SettlementDigest,
	SettlementMember,
	SettlementSummary,
	SettlementTransfer,
} from "@/types";

async function getAuthUserId(): Promise<string> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session?.user?.id) {
		throw new Error("인증이 필요합니다.");
	}
	return session.user.id;
}

function getMonthRange(month?: string): { startDate: string; nextMonth: string } | null {
	if (!month) return null;

	const startDate = `${month}-01`;
	const [year, monthNumber] = month.split("-").map(Number);
	const nextMonth = monthNumber === 12
		? `${year + 1}-01-01`
		: `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`;

	return { startDate, nextMonth };
}

function normalizeSourceType(value: string): SettlementSummary["sourceType"] {
	if (value === "image" || value === "manual") return value;
	return "text";
}

function normalizeSourceService(value: string): SettlementSummary["sourceService"] {
	if (value === "kakao" || value === "toss") return value;
	return "unknown";
}

function buildSettlementSummary(
	row: {
		id: string;
		transactionId: string;
		title: string;
		totalAmount: number;
		myShareAmount: number;
		participantCount: number;
		role: SettlementSummary["role"];
		status: SettlementSummary["status"];
		sourceType: SettlementSummary["sourceType"];
		sourceService: SettlementSummary["sourceService"];
		createdAt: Date;
		updatedAt: Date;
	},
	members: SettlementMember[],
	transfers: SettlementTransfer[],
): SettlementSummary {
	const progress = calculateSettlementProgress({
		role: row.role,
		totalAmount: row.totalAmount,
		myShareAmount: row.myShareAmount,
		members,
		transfers,
	});

	return {
		id: row.id,
		transactionId: row.transactionId,
		title: row.title,
		totalAmount: row.totalAmount,
		myShareAmount: row.myShareAmount,
		participantCount: row.participantCount,
		role: row.role,
		status: progress.status,
		sourceType: row.sourceType,
		sourceService: row.sourceService,
		outstandingAmount: progress.outstandingAmount,
		settledAmount: progress.settledAmount,
		memberCount: members.length,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

async function loadSettlementCollections(
	userId: string,
	month?: string,
): Promise<{
	settlementRows: Array<{
		id: string;
		transactionId: string;
		title: string;
		totalAmount: number;
		myShareAmount: number;
		participantCount: number;
		role: SettlementSummary["role"];
		status: SettlementSummary["status"];
		sourceType: SettlementSummary["sourceType"];
		sourceService: SettlementSummary["sourceService"];
		createdAt: Date;
		updatedAt: Date;
	}>;
	memberMap: Map<string, SettlementMember[]>;
	transferMap: Map<string, SettlementTransfer[]>;
}> {
	const monthRange = getMonthRange(month);
	const conditions = [eq(settlements.userId, userId)];

	if (monthRange) {
		conditions.push(gte(transactions.date, monthRange.startDate));
		conditions.push(lt(transactions.date, monthRange.nextMonth));
	}

	const settlementRowsRaw = await db
		.select({
			id: settlements.id,
			transactionId: settlements.transactionId,
			title: settlements.title,
			totalAmount: settlements.totalAmount,
			myShareAmount: settlements.myShareAmount,
			participantCount: settlements.participantCount,
			role: settlements.role,
			status: settlements.status,
			sourceType: settlements.sourceType,
			sourceService: settlements.sourceService,
			createdAt: settlements.createdAt,
			updatedAt: settlements.updatedAt,
		})
		.from(settlements)
		.innerJoin(transactions, eq(settlements.transactionId, transactions.id))
		.where(and(...conditions))
		.orderBy(desc(settlements.createdAt));

	const settlementRows = settlementRowsRaw.map((row) => ({
		...row,
		sourceType: normalizeSourceType(row.sourceType),
		sourceService: normalizeSourceService(row.sourceService),
	}));

	if (settlementRows.length === 0) {
		return {
			settlementRows,
			memberMap: new Map(),
			transferMap: new Map(),
		};
	}

	const settlementIds = settlementRows.map((row) => row.id);

	const memberRows = await db
		.select({
			id: settlementMembers.id,
			settlementId: settlementMembers.settlementId,
			name: settlementMembers.name,
			shareAmount: settlementMembers.shareAmount,
			status: settlementMembers.status,
			paidAmount: settlementMembers.paidAmount,
			paidAt: settlementMembers.paidAt,
			sortOrder: settlementMembers.sortOrder,
			createdAt: settlementMembers.createdAt,
			updatedAt: settlementMembers.updatedAt,
		})
		.from(settlementMembers)
		.where(inArray(settlementMembers.settlementId, settlementIds))
		.orderBy(settlementMembers.sortOrder, settlementMembers.createdAt);

	const transferRows = await db
		.select({
			id: settlementTransfers.id,
			settlementId: settlementTransfers.settlementId,
			memberId: settlementTransfers.memberId,
			accountId: settlementTransfers.accountId,
			direction: settlementTransfers.direction,
			amount: settlementTransfers.amount,
			occurredAt: settlementTransfers.occurredAt,
			memo: settlementTransfers.memo,
			createdAt: settlementTransfers.createdAt,
		})
		.from(settlementTransfers)
		.where(inArray(settlementTransfers.settlementId, settlementIds))
		.orderBy(desc(settlementTransfers.occurredAt));

	const memberMap = new Map<string, SettlementMember[]>();
	for (const member of memberRows) {
		const list = memberMap.get(member.settlementId) ?? [];
		list.push(member);
		memberMap.set(member.settlementId, list);
	}

	const transferMap = new Map<string, SettlementTransfer[]>();
	for (const transfer of transferRows) {
		const list = transferMap.get(transfer.settlementId) ?? [];
		list.push({
			...transfer,
			memo: decryptNullable(transfer.memo),
		});
		transferMap.set(transfer.settlementId, list);
	}

	return { settlementRows, memberMap, transferMap };
}

async function syncSettlementStatus(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], settlementId: string): Promise<void> {
	const [settlement] = await tx
		.select({
			role: settlements.role,
			totalAmount: settlements.totalAmount,
			myShareAmount: settlements.myShareAmount,
		})
		.from(settlements)
		.where(eq(settlements.id, settlementId));

	if (!settlement) {
		return;
	}

	const members = await tx
		.select({
			shareAmount: settlementMembers.shareAmount,
			paidAmount: settlementMembers.paidAmount,
		})
		.from(settlementMembers)
		.where(eq(settlementMembers.settlementId, settlementId));

	const transfers = await tx
		.select({
			direction: settlementTransfers.direction,
			amount: settlementTransfers.amount,
		})
		.from(settlementTransfers)
		.where(eq(settlementTransfers.settlementId, settlementId));

	const progress = calculateSettlementProgress({
		role: settlement.role,
		totalAmount: settlement.totalAmount,
		myShareAmount: settlement.myShareAmount,
		members,
		transfers,
	});

	await tx
		.update(settlements)
		.set({
			status: progress.status,
			updatedAt: new Date(),
		})
		.where(eq(settlements.id, settlementId));
}

export async function getSettlementDigest(month?: string): Promise<SettlementDigest> {
	const userId = await getAuthUserId();
	const { settlementRows, memberMap, transferMap } = await loadSettlementCollections(userId, month);

	let pendingCount = 0;
	let completedCount = 0;
	let receivableAmount = 0;
	let payableAmount = 0;

	for (const row of settlementRows) {
		const summary = buildSettlementSummary(
			row,
			memberMap.get(row.id) ?? [],
			transferMap.get(row.id) ?? [],
		);

		if (summary.status === "completed") {
			completedCount += 1;
		} else {
			pendingCount += 1;
		}

		if (summary.role === "organizer") {
			receivableAmount += summary.outstandingAmount;
		} else {
			payableAmount += summary.outstandingAmount;
		}
	}

	return {
		pendingCount,
		receivableAmount,
		payableAmount,
		completedCount,
	};
}

export async function getSettlements(month?: string): Promise<SettlementSummary[]> {
	const userId = await getAuthUserId();
	const { settlementRows, memberMap, transferMap } = await loadSettlementCollections(userId, month);

	return settlementRows.map((row) =>
		buildSettlementSummary(
			row,
			memberMap.get(row.id) ?? [],
			transferMap.get(row.id) ?? [],
		)
	);
}

export async function getSettlementDetail(settlementId: string): Promise<SettlementDetail | null> {
	const userId = await getAuthUserId();
	const { settlementRows, memberMap, transferMap } = await loadSettlementCollections(userId);
	const row = settlementRows.find((item) => item.id === settlementId);

	if (!row) {
		return null;
	}

	const members = memberMap.get(row.id) ?? [];
	const transfers = transferMap.get(row.id) ?? [];
	const summary = buildSettlementSummary(row, members, transfers);

	return {
		...summary,
		members,
		transfers,
	};
}

export async function updateSettlementMemberStatus(
	memberId: string,
	data: {
		status: SettlementMember["status"];
		paidAmount?: number;
		paidAt?: Date | null;
	},
): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		const [member] = await db
			.select({
				id: settlementMembers.id,
				settlementId: settlementMembers.settlementId,
				shareAmount: settlementMembers.shareAmount,
			})
			.from(settlementMembers)
			.innerJoin(settlements, eq(settlementMembers.settlementId, settlements.id))
			.where(and(eq(settlementMembers.id, memberId), eq(settlements.userId, userId)));

		if (!member) {
			return { success: false, error: "정산 멤버를 찾을 수 없습니다." };
		}

		const nextPaidAmount = data.paidAmount !== undefined
			? Math.max(0, Math.min(data.paidAmount, member.shareAmount))
			: data.status === "paid"
				? member.shareAmount
				: 0;

		await db.transaction(async (tx) => {
			await tx
				.update(settlementMembers)
				.set({
					status: data.status,
					paidAmount: nextPaidAmount,
					paidAt: data.paidAt !== undefined
						? data.paidAt
						: nextPaidAmount > 0
							? new Date()
							: null,
					updatedAt: new Date(),
				})
				.where(eq(settlementMembers.id, memberId));

			await syncSettlementStatus(tx, member.settlementId);
		});

		revalidateSettlementPages();
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "정산 상태 수정에 실패했습니다.",
		};
	}
}

export async function recordSettlementTransfer(
	settlementId: string,
	data: {
		memberId?: string | null;
		accountId?: string | null;
		direction: SettlementTransfer["direction"];
		amount: number;
		occurredAt?: Date;
		memo?: string | null;
	},
): Promise<{ success: true } | { success: false; error: string }> {
	try {
		const userId = await getAuthUserId();

		const [settlement] = await db
			.select({
				id: settlements.id,
				role: settlements.role,
				totalAmount: settlements.totalAmount,
				myShareAmount: settlements.myShareAmount,
			})
			.from(settlements)
			.where(and(eq(settlements.id, settlementId), eq(settlements.userId, userId)));

		if (!settlement) {
			return { success: false, error: "정산 정보를 찾을 수 없습니다." };
		}

		const memberId = data.memberId ?? null;
		const [member] = memberId ? await db
			.select({
				id: settlementMembers.id,
				settlementId: settlementMembers.settlementId,
				shareAmount: settlementMembers.shareAmount,
				paidAmount: settlementMembers.paidAmount,
			})
			.from(settlementMembers)
			.innerJoin(settlements, eq(settlementMembers.settlementId, settlements.id))
			.where(
				and(
					eq(settlementMembers.id, memberId),
					eq(settlementMembers.settlementId, settlementId),
					eq(settlements.userId, userId),
				),
			)
			: [];

		if (memberId && !member) {
			return { success: false, error: "정산 멤버를 찾을 수 없습니다." };
		}

		const amount = Math.max(0, Math.trunc(data.amount));
		if (amount <= 0) {
			return { success: false, error: "정산 금액은 1원 이상이어야 합니다." };
		}
		if (data.direction === "receive" && !member) {
			return { success: false, error: "수금 기록은 정산 멤버를 선택해야 합니다." };
		}
		if (settlement.role === "participant" && data.direction !== "send") {
			return { success: false, error: "참여자 정산은 송금 기록만 남길 수 있습니다." };
		}

		await db.transaction(async (tx) => {
			if (data.direction === "receive" && member) {
				const [currentMember] = await tx
					.select({
						shareAmount: settlementMembers.shareAmount,
						paidAmount: settlementMembers.paidAmount,
					})
					.from(settlementMembers)
					.where(eq(settlementMembers.id, member.id));

				if (!currentMember) {
					throw new Error("정산 멤버를 찾을 수 없습니다.");
				}

				const remainingAmount = Math.max(currentMember.shareAmount - currentMember.paidAmount, 0);
				if (amount > remainingAmount) {
					throw new Error("멤버의 남은 정산 금액을 초과해서 수금할 수 없습니다.");
				}
			}

			if (data.direction === "send") {
				const currentMembers = await tx
					.select({
						shareAmount: settlementMembers.shareAmount,
						paidAmount: settlementMembers.paidAmount,
					})
					.from(settlementMembers)
					.where(eq(settlementMembers.settlementId, settlement.id));
				const currentTransfers = await tx
					.select({
						direction: settlementTransfers.direction,
						amount: settlementTransfers.amount,
					})
					.from(settlementTransfers)
					.where(eq(settlementTransfers.settlementId, settlement.id));
				const progress = calculateSettlementProgress({
					role: settlement.role,
					totalAmount: settlement.totalAmount,
					myShareAmount: settlement.myShareAmount,
					members: currentMembers,
					transfers: currentTransfers,
				});

				if (amount > progress.outstandingAmount) {
					throw new Error("남은 정산 금액을 초과해서 송금 기록을 남길 수 없습니다.");
				}
			}

			await tx.insert(settlementTransfers).values({
				settlementId: settlement.id,
				memberId: member?.id ?? null,
				accountId: data.accountId ?? null,
				direction: data.direction,
				amount,
				occurredAt: data.occurredAt ?? new Date(),
				memo: encryptNullable(data.memo ?? null),
			});

			if (data.accountId) {
				const delta = data.direction === "receive" ? amount : -amount;
				await applyAccountDelta(tx, data.accountId, delta);
			}

			if (data.direction === "receive" && member) {
				const nextPaidAmount = Math.min(member.paidAmount + amount, member.shareAmount);
				const nextStatus = nextPaidAmount === 0
					? "pending"
					: nextPaidAmount >= member.shareAmount
						? "paid"
						: "partial";

				await tx
					.update(settlementMembers)
					.set({
						paidAmount: nextPaidAmount,
						status: nextStatus,
						paidAt: nextPaidAmount > 0 ? new Date() : null,
						updatedAt: new Date(),
					})
					.where(eq(settlementMembers.id, member.id));
			}

			await syncSettlementStatus(tx, settlement.id);
		});

		revalidateSettlementPages();
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "정산 이력 기록에 실패했습니다.",
		};
	}
}

export async function recordParsedSettlementTransfersBatch(
	items: Array<{
		settlementId: string;
		memberId?: string | null;
		accountId?: string | null;
		direction: SettlementTransfer["direction"];
		amount: number;
		occurredAt?: Date;
		memo?: string | null;
	}>,
): Promise<{ success: true; count: number } | { success: false; error: string }> {
	if (items.length === 0) {
		return { success: false, error: "기록할 정산 이력이 없습니다." };
	}

	try {
		let count = 0;

		for (const item of items) {
			const result = await recordSettlementTransfer(item.settlementId, {
				memberId: item.memberId ?? null,
				accountId: item.accountId ?? null,
				direction: item.direction,
				amount: item.amount,
				occurredAt: item.occurredAt,
				memo: item.memo ?? null,
			});

			if (!result.success) {
				return result;
			}

			count += 1;
		}

		return { success: true, count };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "정산 이력 기록에 실패했습니다.",
		};
	}
}
