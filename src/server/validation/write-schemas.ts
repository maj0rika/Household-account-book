import { z } from "zod";

export const transactionTypeSchema = z.enum(["income", "expense"]);
export const accountTypeSchema = z.enum(["asset", "debt"]);
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다.");
export const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "월 형식이 올바르지 않습니다.");
export const uuidSchema = z.string().uuid("ID 형식이 올바르지 않습니다.");
export const amountSchema = z.number().int().positive("금액은 1 이상의 정수여야 합니다.").max(1_000_000_000_000);
export const descriptionSchema = z.string().trim().min(1, "설명이 필요합니다.").max(200);
export const categoryNameSchema = z.string().trim().min(1).max(40);
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
	icon: z.string().trim().min(1).max(16),
	balance: z.number().int().min(0).max(1_000_000_000_000),
});

export const updateAccountSchema = z.object({
	name: accountNameSchema.optional(),
	icon: z.string().trim().min(1).max(16).optional(),
	balance: z.number().int().min(0).max(1_000_000_000_000).optional(),
	subType: z.string().trim().min(1).max(40).optional(),
	sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export const upsertBudgetSchema = z.object({
	categoryId: uuidSchema.nullable(),
	amount: amountSchema,
	month: monthSchema,
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
