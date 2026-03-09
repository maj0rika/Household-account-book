import { describe, expect, it } from "vitest";

import { resolveSettlementTransferMatches } from "./transfer-matching-core";
import type { PendingSettlementContext } from "./transfer-matching-core";
import type { ParsedSettlementTransfer } from "@/server/llm/types";

const BASE_SETTLEMENTS: PendingSettlementContext[] = [
	{
		id: "settlement-organizer",
		title: "마라탕 정산",
		role: "organizer",
		totalAmount: 45000,
		myShareAmount: 15000,
		sourceService: "kakao",
		createdAt: new Date("2026-03-09T12:00:00+09:00"),
		outstandingAmount: 30000,
		members: [
			{
				id: "member-kim",
				name: "김철수",
				remainingAmount: 15000,
			},
			{
				id: "member-lee",
				name: "이영희",
				remainingAmount: 15000,
			},
		],
	},
	{
		id: "settlement-participant",
		title: "보드게임 정산",
		role: "participant",
		totalAmount: 60000,
		myShareAmount: 20000,
		sourceService: "toss",
		createdAt: new Date("2026-03-08T18:00:00+09:00"),
		outstandingAmount: 20000,
		members: [],
	},
];

describe("settlement transfer matching", () => {
	it("총무 입금 알림은 이름과 금액이 맞으면 멤버로 자동 매칭한다", () => {
		const drafts: ParsedSettlementTransfer[] = [
			{
				date: "2026-03-09",
				direction: "receive",
				amount: 15000,
				counterpartyName: "김철수",
				memo: "카카오페이 입금",
				sourceType: "image",
				sourceService: "kakao",
			},
		];

		const [matched] = resolveSettlementTransferMatches(drafts, BASE_SETTLEMENTS);

		expect(matched.matchedSettlementId).toBe("settlement-organizer");
		expect(matched.matchedMemberId).toBe("member-kim");
		expect(matched.matchedMemberName).toBe("김철수");
		expect(matched.candidates).toHaveLength(2);
	});

	it("총무 입금 알림이 동률이면 자동 매칭하지 않고 후보만 남긴다", () => {
		const drafts: ParsedSettlementTransfer[] = [
			{
				date: "2026-03-09",
				direction: "receive",
				amount: 15000,
				counterpartyName: null,
				memo: "입금 알림",
				sourceType: "text",
				sourceService: "unknown",
			},
		];

		const [matched] = resolveSettlementTransferMatches(drafts, BASE_SETTLEMENTS);

		expect(matched.matchedSettlementId).toBeNull();
		expect(matched.matchedMemberId).toBeNull();
		expect(matched.candidates).toHaveLength(2);
	});

	it("참여자 송금 알림은 내 미정산 금액과 일치하면 자동 매칭한다", () => {
		const drafts: ParsedSettlementTransfer[] = [
			{
				date: "2026-03-09",
				direction: "send",
				amount: 20000,
				counterpartyName: "홍길동",
				memo: "보드게임 정산 송금 완료",
				sourceType: "text",
				sourceService: "toss",
			},
		];

		const [matched] = resolveSettlementTransferMatches(drafts, BASE_SETTLEMENTS);

		expect(matched.matchedSettlementId).toBe("settlement-participant");
		expect(matched.matchedMemberId).toBeNull();
		expect(matched.matchedSettlementTitle).toBe("보드게임 정산");
	});

	it("대기 중 정산이 없으면 매칭 정보를 비운다", () => {
		const drafts: ParsedSettlementTransfer[] = [
			{
				date: "2026-03-09",
				direction: "send",
				amount: 20000,
				counterpartyName: "홍길동",
				memo: "송금 완료",
				sourceType: "text",
				sourceService: "toss",
				matchedSettlementId: "stale-settlement",
				matchedMemberId: "stale-member",
				candidates: [
					{
						settlementId: "stale-settlement",
						settlementTitle: "오래된 후보",
						settlementRole: "participant",
						outstandingAmount: 20000,
					},
				],
			},
		];

		const [matched] = resolveSettlementTransferMatches(drafts, []);

		expect(matched.matchedSettlementId).toBeNull();
		expect(matched.matchedMemberId).toBeNull();
		expect(matched.candidates).toEqual([]);
	});
});
