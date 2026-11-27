import { describe, expect, it } from "vitest";

import { LedgerOwnershipError } from "@/server/lib/account-ledger";
import {
	addCategorySchema,
	createSingleTransactionSchema,
	deleteUserAccountSchema,
	monthSchema,
	parsedTransactionSchema,
	sanitizeActionError,
	upsertBudgetSchema,
	upsertParsedAccountsBatchSchema,
	uuidSchema,
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

	it("예산 월 형식과 유효 월 범위를 강제한다", () => {
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
		expect(monthSchema.safeParse("2026-13").success).toBe(false);
		expect(monthSchema.safeParse("2026-00").success).toBe(false);
	});

	it("카테고리 추가 입력을 검증하고 공백을 정리한다", () => {
		const valid = addCategorySchema.safeParse({
			name: "  간식  ",
			icon: "☕",
			type: "expense",
		});
		expect(valid.success).toBe(true);
		if (valid.success) {
			expect(valid.data.name).toBe("간식");
		}

		expect(addCategorySchema.safeParse({
			name: "   ",
			icon: "☕",
			type: "expense",
		}).success).toBe(false);
		expect(addCategorySchema.safeParse({
			name: "커피",
			icon: "",
			type: "transfer",
		}).success).toBe(false);
	});

	it("삭제 ID UUID와 계정 삭제 비밀번호를 검증한다", () => {
		expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
		expect(uuidSchema.safeParse("123e4567-e89b-12d3-a456-426614174000").success).toBe(true);

		expect(deleteUserAccountSchema.safeParse("").success).toBe(false);
		expect(deleteUserAccountSchema.safeParse("secret-pw").success).toBe(true);
	});

	it("자산/부채 일괄 저장 배치를 검증한다", () => {
		expect(upsertParsedAccountsBatchSchema.safeParse([]).success).toBe(false);
		expect(upsertParsedAccountsBatchSchema.safeParse([
			{
				action: "update",
				accountId: "bad-id",
				name: "주계좌",
				type: "asset",
				subType: "bank",
				icon: "🏦",
				balance: 1000,
			},
		]).success).toBe(false);
		expect(upsertParsedAccountsBatchSchema.safeParse([
			{
				action: "create",
				name: "주계좌",
				type: "asset",
				subType: "bank",
				icon: "🏦",
				balance: 0,
			},
		]).success).toBe(true);
	});

	it("도메인/소유권 오류만 노출하고 내부 DB/시스템 오류는 마스킹한다", () => {
		expect(
			sanitizeActionError(new LedgerOwnershipError("계좌를 찾을 수 없거나 권한이 없습니다."), "fallback"),
		).toBe("계좌를 찾을 수 없거나 권한이 없습니다.");
		expect(
			sanitizeActionError(new Error("인증이 필요합니다."), "fallback"),
		).toBe("인증이 필요합니다.");
		expect(
			sanitizeActionError(new Error('insert into "categories" violates foreign key constraint'), "저장에 실패했습니다."),
		).toBe("저장에 실패했습니다.");
		expect(
			sanitizeActionError("non-error", "삭제에 실패했습니다."),
		).toBe("삭제에 실패했습니다.");
	});
});
