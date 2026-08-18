import { describe, expect, it } from "vitest";

import {
	createSingleTransactionSchema,
	parsedTransactionSchema,
	upsertBudgetSchema,
} from "../write-schemas";

describe("write-schemas", () => {
	it("양수 정수 금액과 날짜만 받는다", () => {
		const parsed = createSingleTransactionSchema.safeParse({
			type: "expense",
			categoryId: null,
			description: "CU",
			amount: 3500,
			date: "2026-08-18",
		});
		expect(parsed.success).toBe(true);

		expect(createSingleTransactionSchema.safeParse({
			type: "expense",
			categoryId: null,
			description: "CU",
			amount: 0,
			date: "2026-08-18",
		}).success).toBe(false);
	});

	it("파싱 거래의 타인 UUID가 아닌 잘못된 ID를 거절한다", () => {
		const parsed = parsedTransactionSchema.safeParse({
			date: "2026-08-18",
			type: "expense",
			category: "식비",
			description: "CU",
			amount: 3500,
			accountId: "not-a-uuid",
		});
		expect(parsed.success).toBe(false);
	});

	it("예산 월 형식을 강제한다", () => {
		expect(upsertBudgetSchema.safeParse({
			categoryId: null,
			amount: 100000,
			month: "2026-08",
		}).success).toBe(true);
		expect(upsertBudgetSchema.safeParse({
			categoryId: null,
			amount: 100000,
			month: "2026/08",
		}).success).toBe(false);
	});
});
