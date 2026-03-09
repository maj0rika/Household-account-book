import { describe, expect, it } from "vitest";

import {
	detectSettlementTransferHint,
	preprocessSettlementTransferMessage,
} from "./settlement-message";

describe("settlement message hints", () => {
	it("열린 정산이 있으면 카카오페이 입금 알림에 receive 힌트를 붙인다", () => {
		const input = "카카오페이 김철수님이 15,000원 보냈어요";

		const hint = detectSettlementTransferHint(input, {
			hasOpenSettlements: true,
		});

		expect(hint).toEqual({
			direction: "receive",
			sourceService: "kakao",
			amount: 15000,
			counterpartyName: "김철수",
		});
	});

	it("열린 정산이 있으면 토스 송금 완료 알림에 send 힌트를 붙인다", () => {
		const processed = preprocessSettlementTransferMessage(
			"토스 송금 완료 20,000원 받는 분 민수",
			{ hasOpenSettlements: true },
		);

		expect(processed).toContain("[정산 이력 힌트]");
		expect(processed).toContain("- direction: send");
		expect(processed).toContain("- sourceService: toss");
		expect(processed).toContain("- amount: 20000");
		expect(processed).toContain("- counterpartyName: 민수");
	});

	it("열린 정산이 없고 명시적 정산 키워드도 없으면 일반 송금 알림은 그대로 둔다", () => {
		const processed = preprocessSettlementTransferMessage(
			"카카오페이 송금 완료 12,000원 받는 분 민수",
			{ hasOpenSettlements: false },
		);

		expect(processed).not.toContain("[정산 이력 힌트]");
	});

	it("명시적 정산 키워드가 있으면 열린 정산이 없어도 힌트를 붙인다", () => {
		const hint = detectSettlementTransferHint(
			"정산 18,000원 송금 완료",
			{ hasOpenSettlements: false },
		);

		expect(hint).toEqual({
			direction: "send",
			sourceService: "unknown",
			amount: 18000,
			counterpartyName: undefined,
		});
	});
});
