import { z } from "zod";

import {
	accountNameSchema,
	accountTypeSchema,
	amountSchema,
	categoryNameSchema,
	descriptionSchema,
	isoDateSchema,
	transactionTypeSchema,
} from "@/server/validation/write-schemas";
import type { ParsedAccount, ParsedTransaction } from "./types";

export const PARSE_SCHEMA_VERSION = "household-parse-v1";

const parsedTransactionCandidateSchema = z.object({
	date: isoDateSchema,
	type: transactionTypeSchema,
	category: categoryNameSchema,
	description: descriptionSchema,
	amount: amountSchema,
	isRecurring: z.boolean(),
	dayOfMonth: z.number().int().min(1).max(31).nullable(),
	suggestedCategory: z.string(),
}).strict();

const parsedAccountCandidateSchema = z.object({
	name: accountNameSchema,
	type: accountTypeSchema,
	subType: z.enum(["bank", "cash", "savings", "investment", "credit_card", "loan", "other"]),
	icon: z.string().trim().min(1).max(16),
	balance: z.number().finite().int().min(0).max(1_000_000_000_000),
}).strict();

export const llmParseCandidateSchema = z.object({
	rejected: z.boolean(),
	reason: z.string(),
	intent: z.enum(["transaction", "account"]),
	transactions: z.array(parsedTransactionCandidateSchema),
	accounts: z.array(parsedAccountCandidateSchema),
}).strict();

export type LlmParseCandidate = z.infer<typeof llmParseCandidateSchema>;

export const LLM_PARSE_JSON_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["rejected", "reason", "intent", "transactions", "accounts"],
	properties: {
		rejected: { type: "boolean" },
		reason: { type: "string" },
		intent: { type: "string", enum: ["transaction", "account"] },
		transactions: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				required: [
					"date",
					"type",
					"category",
					"description",
					"amount",
					"isRecurring",
					"dayOfMonth",
					"suggestedCategory",
				],
				properties: {
					date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
					type: { type: "string", enum: ["income", "expense"] },
					category: { type: "string", minLength: 1, maxLength: 40 },
					description: { type: "string", minLength: 1, maxLength: 200 },
					amount: { type: "integer", minimum: 1, maximum: 1_000_000_000_000 },
					isRecurring: { type: "boolean" },
					dayOfMonth: {
						anyOf: [
							{ type: "integer", minimum: 1, maximum: 31 },
							{ type: "null" },
						],
					},
					suggestedCategory: { type: "string" },
				},
			},
		},
		accounts: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				required: ["name", "type", "subType", "icon", "balance"],
				properties: {
					name: { type: "string", minLength: 1, maxLength: 80 },
					type: { type: "string", enum: ["asset", "debt"] },
					subType: {
						type: "string",
						enum: ["bank", "cash", "savings", "investment", "credit_card", "loan", "other"],
					},
					icon: { type: "string", minLength: 1, maxLength: 16 },
					balance: { type: "integer", minimum: 0, maximum: 1_000_000_000_000 },
				},
			},
		},
	},
} as const;

export const LLM_PARSE_RESPONSE_FORMAT = {
	type: "json_schema",
	json_schema: {
		name: PARSE_SCHEMA_VERSION,
		strict: true,
		schema: LLM_PARSE_JSON_SCHEMA,
	},
} as const;

export class ParseSchemaError extends Error {
	readonly code = "schema";

	constructor(message: string) {
		super(message);
		this.name = "ParseSchemaError";
	}
}

function stripKnownReasoningPrefix(text: string): string {
	return text.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();
}

export function parseLlmContent(content: string): {
	intent: "transaction" | "account";
	transactions: ParsedTransaction[];
	accounts: ParsedAccount[];
} {
	const normalized = stripKnownReasoningPrefix(content);
	let raw: unknown;
	try {
		raw = JSON.parse(normalized);
	} catch {
		throw new ParseSchemaError("LLM 응답이 JSON이 아닙니다.");
	}

	const parsed = llmParseCandidateSchema.safeParse(raw);
	if (!parsed.success) {
		throw new ParseSchemaError(parsed.error.issues[0]?.message ?? "LLM 응답 스키마가 올바르지 않습니다.");
	}

	if (parsed.data.rejected) {
		throw new ParseSchemaError(
			parsed.data.reason.trim() || "가계부와 관련된 내용을 입력해 주세요.",
		);
	}

	const transactions: ParsedTransaction[] = parsed.data.transactions.map((item) => ({
		date: item.date,
		type: item.type,
		category: item.category,
		description: item.description,
		amount: item.amount,
		isRecurring: item.isRecurring || undefined,
		dayOfMonth: item.dayOfMonth ?? undefined,
		suggestedCategory: item.suggestedCategory.trim() || undefined,
	}));

	if (transactions.length === 0 && parsed.data.accounts.length === 0) {
		throw new ParseSchemaError("파싱 결과가 비어 있습니다.");
	}

	return {
		intent: parsed.data.intent,
		transactions,
		accounts: parsed.data.accounts,
	};
}
