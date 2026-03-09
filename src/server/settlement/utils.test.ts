import { describe, expect, it } from "vitest";

import { calculateSettlementProgress, normalizeSettlementDraft, resolveAccountImpactAmount } from "./utils";
import type { ParsedTransaction } from "@/server/llm/types";

describe("settlement utils", () => {
	it("총무 정산 초안은 총액과 내 몫을 분리한다", () => {
		const item: ParsedTransaction = {
			date: "2026-03-09",
			type: "expense",
			category: "식비",
			description: "마라탕",
			amount: 15000,
			isSettlement: true,
			settlementRole: "organizer",
			settlementTotalAmount: 45000,
			myShareAmount: 15000,
			participantCount: 3,
			settlementMembers: [
				{ name: "김철수", shareAmount: 15000 },
				{ name: "이영희", shareAmount: 15000 },
			],
		};

		const draft = normalizeSettlementDraft(item);

		expect(draft).not.toBeNull();
		expect(draft?.role).toBe("organizer");
		expect(draft?.totalAmount).toBe(45000);
		expect(draft?.myShareAmount).toBe(15000);
		expect(draft?.participantCount).toBe(3);
		expect(draft?.members).toHaveLength(2);
	});

	it("총무 거래의 account impact는 총액을 우선 사용한다", () => {
		const item: ParsedTransaction = {
			date: "2026-03-09",
			type: "expense",
			category: "식비",
			description: "마라탕",
			amount: 15000,
			isSettlement: true,
			settlementRole: "organizer",
			settlementTotalAmount: 45000,
		};

		expect(resolveAccountImpactAmount(item)).toBe(45000);
	});

	it("일반 거래는 amount를 account impact로 사용한다", () => {
		const item: ParsedTransaction = {
			date: "2026-03-09",
			type: "expense",
			category: "카페",
			description: "커피",
			amount: 4500,
		};

		expect(resolveAccountImpactAmount(item)).toBe(4500);
	});

	it("총무 정산 진행률은 내 몫을 제외한 미수금 기준으로 계산한다", () => {
		const progress = calculateSettlementProgress({
			role: "organizer",
			totalAmount: 45000,
			myShareAmount: 15000,
			members: [
				{ shareAmount: 15000, paidAmount: 15000 },
				{ shareAmount: 15000, paidAmount: 0 },
			],
			transfers: [],
		});

		expect(progress.targetAmount).toBe(30000);
		expect(progress.settledAmount).toBe(15000);
		expect(progress.outstandingAmount).toBe(15000);
		expect(progress.status).toBe("partial");
	});

	it("참여자 정산 진행률은 송금 이력만으로 완료 처리된다", () => {
		const progress = calculateSettlementProgress({
			role: "participant",
			totalAmount: 45000,
			myShareAmount: 15000,
			members: [],
			transfers: [
				{ direction: "send", amount: 15000 },
			],
		});

		expect(progress.targetAmount).toBe(15000);
		expect(progress.settledAmount).toBe(15000);
		expect(progress.outstandingAmount).toBe(0);
		expect(progress.status).toBe("completed");
	});
});
