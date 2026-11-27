import { z } from "zod";

export const transactionTypeSchema = z.enum(["income", "expense"]);
export const moneyMovementTypeSchema = z.enum(["income", "expense", "transfer"]);
export const accountTypeSchema = z.enum(["asset", "debt"]);
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다.");
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "월 형식이 올바르지 않습니다.");
export const uuidSchema = z.string().uuid("ID 형식이 올바르지 않습니다.");
export const amountSchema = z.number().int().positive("금액은 1 이상의 정수여야 합니다.").max(1_000_000_000_000);
export const descriptionSchema = z.string().trim().min(1, "설명이 필요합니다.").max(200);
export const categoryNameSchema = z.string().trim().min(1, "카테고리 이름을 입력해 주세요.").max(40, "카테고리 이름은 40자 이하로 입력해 주세요.");
export const iconSchema = z.string().trim().min(1, "아이콘을 선택해 주세요.").max(16);
export const accountNameSchema = z.string().trim().min(1).max(80);
export const dayOfMonthSchema = z.number().int().min(1).max(31);

export const parsedTransactionSchema = z.object({
	date: isoDateSchema,
	type: transactionTypeSchema,
	category: categoryNameSchema,
	description: descriptionSchema,
	amount: amountSchema,
	isRecurring: z.boolean().optional(),
	dayOfMonth: dayOfMonthSchema.optional(),
	suggestedCategory: categoryNameSchema.optional(),
	accountId: uuidSchema.nullable().optional(),
});

export const createSingleTransactionSchema = z.object({
	type: transactionTypeSchema,
	categoryId: uuidSchema.nullable(),
	accountId: uuidSchema.nullable().optional(),
	description: descriptionSchema,
	amount: amountSchema,
	date: isoDateSchema,
	memo: z.string().trim().max(500).optional(),
});

export const updateTransactionSchema = z.object({
	type: transactionTypeSchema.optional(),
	categoryId: uuidSchema.nullable().optional(),
	accountId: uuidSchema.nullable().optional(),
	description: descriptionSchema.optional(),
	amount: amountSchema.optional(),
	date: isoDateSchema.optional(),
	memo: z.string().trim().max(500).nullable().optional(),
});

export const createAccountSchema = z.object({
	name: accountNameSchema,
	type: accountTypeSchema,
	subType: z.string().trim().min(1).max(40),
	icon: iconSchema,
	balance: z.number().int().min(0).max(1_000_000_000_000),
});

export const updateAccountSchema = z.object({
	name: accountNameSchema.optional(),
	icon: iconSchema.optional(),
	balance: z.number().int().min(0).max(1_000_000_000_000).optional(),
	subType: z.string().trim().min(1).max(40).optional(),
	sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export const accountBatchItemSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("create"),
		name: accountNameSchema,
		type: accountTypeSchema,
		subType: z.string().trim().min(1).max(40),
		icon: iconSchema,
		balance: z.number().int().min(0).max(1_000_000_000_000),
	}),
	z.object({
		action: z.literal("update"),
		accountId: uuidSchema,
		name: accountNameSchema,
		type: accountTypeSchema,
		subType: z.string().trim().min(1).max(40),
		icon: iconSchema,
		balance: z.number().int().min(0).max(1_000_000_000_000),
	}),
]);

export const upsertParsedAccountsBatchSchema = z
	.array(accountBatchItemSchema)
	.min(1, "저장할 항목이 없습니다.");

export const addCategorySchema = z.object({
	name: categoryNameSchema,
	icon: iconSchema,
	type: transactionTypeSchema,
});

export const deleteUserAccountSchema = z
	.string()
	.min(1, "비밀번호를 입력해 주세요.")
	.max(200, "비밀번호 형식이 올바르지 않습니다.");

export const upsertBudgetSchema = z.object({
	categoryId: uuidSchema.nullable(),
	amount: amountSchema,
	month: monthSchema,
});

export const createTransferSchema = z.object({
	fromAccountId: uuidSchema,
	toAccountId: uuidSchema,
	description: descriptionSchema,
	amount: amountSchema,
	date: isoDateSchema,
	memo: z.string().trim().max(500).optional(),
}).refine((value) => value.fromAccountId !== value.toAccountId, {
	message: "이체 출금 계좌와 입금 계좌가 같습니다.",
});

export const createRecurringSchema = z.object({
	type: transactionTypeSchema,
	categoryId: uuidSchema.nullable(),
	description: descriptionSchema,
	amount: amountSchema,
	dayOfMonth: dayOfMonthSchema,
});

export function firstSchemaError(error: z.ZodError): string {
	return error.issues[0]?.message ?? "입력이 올바르지 않습니다.";
}

const SAFE_ACTION_ERROR_NAMES = new Set(["LedgerOwnershipError"]);
const SAFE_ACTION_ERROR_MESSAGES = new Set([
	"인증이 필요합니다.",
	"수정할 계정을 찾을 수 없습니다.",
	"이체 계좌 정보가 없습니다.",
	"이체 출금 계좌와 입금 계좌가 같습니다.",
]);

export function sanitizeActionError(error: unknown, fallbackMessage: string): string {
	if (error instanceof Error) {
		if (SAFE_ACTION_ERROR_NAMES.has(error.name) || SAFE_ACTION_ERROR_MESSAGES.has(error.message)) {
			return error.message;
		}
	}
	return fallbackMessage;
}
