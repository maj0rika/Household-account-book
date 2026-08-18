import { describe, expect, it } from "vitest";

import { computeBalanceDelta, computeTransferDelta } from "../account-ledger";

describe("computeBalanceDelta", () => {
	it("자산 수입은 잔액을 늘린다", () => {
		expect(computeBalanceDelta("asset", "income", 10_000)).toBe(10_000);
	});

	it("자산 지출은 잔액을 줄인다", () => {
		expect(computeBalanceDelta("asset", "expense", 10_000)).toBe(-10_000);
	});

	it("부채 지출은 부채를 늘린다", () => {
		expect(computeBalanceDelta("debt", "expense", 50_000)).toBe(50_000);
	});

	it("부채 수입은 부채를 줄인다", () => {
		expect(computeBalanceDelta("debt", "income", 50_000)).toBe(-50_000);
	});

	it("0 이하는 원래 오류를 던진다", () => {
		expect(() => computeBalanceDelta("asset", "expense", 0)).toThrow(
			"잔액 변경 금액이 유효하지 않습니다: 0",
		);
		expect(() => computeBalanceDelta("debt", "expense", -1)).toThrow(
			"잔액 변경 금액이 유효하지 않습니다: -1",
		);
	});

	it("이체는 자산 출금/입금과 부채 출금/상환을 반대로 적용한다", () => {
		expect(computeTransferDelta("asset", "source", 10_000)).toBe(-10_000);
		expect(computeTransferDelta("asset", "destination", 10_000)).toBe(10_000);
		expect(computeTransferDelta("debt", "source", 10_000)).toBe(10_000);
		expect(computeTransferDelta("debt", "destination", 10_000)).toBe(-10_000);
	});

	it("유한하지 않은 금액은 원래 오류를 던진다", () => {
		expect(() => computeBalanceDelta("asset", "income", Number.NaN)).toThrow(
			"잔액 변경 금액이 유효하지 않습니다: NaN",
		);
		expect(() => computeBalanceDelta("asset", "income", Number.POSITIVE_INFINITY)).toThrow(
			"잔액 변경 금액이 유효하지 않습니다: Infinity",
		);
	});
});
