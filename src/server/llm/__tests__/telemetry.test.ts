import { afterEach, describe, expect, it, vi } from "vitest";

import type { LLMChatClient } from "../client";
import { LLMTimeoutError, parseUnifiedImage, parseUnifiedText } from "../index";
import {
	buildAggregateFailureLog,
	createParseRequestId,
	hashInput,
	redactInputPreview,
	sanitizeErrorMessage,
	type LlmAttemptTelemetry,
} from "../telemetry";

const SAMPLE_CATEGORIES = [
	{ name: "식비", type: "expense" as const },
	{ name: "카페/간식", type: "expense" as const },
	{ name: "급여", type: "income" as const },
];

const VALID_TEXT_JSON = JSON.stringify({
	rejected: false,
	reason: "",
	intent: "transaction",
	transactions: [
		{
			date: "2026-08-18",
			type: "expense",
			category: "카페/간식",
			description: "스타벅스",
			amount: 4500,
			isRecurring: false,
			dayOfMonth: null,
			suggestedCategory: "",
		},
	],
	accounts: [],
});

afterEach(() => {
	vi.restoreAllMocks();
	delete process.env.LLM_DEBUG_LOG_RAW;
});

describe("LLM telemetry redaction and sanitization", () => {
	it("redacts amounts, digits, cards, accounts, phones, emails, and secrets in inputPreview", () => {
		const raw =
			"스타벅스 4500원 카카오뱅크 3333-01-1234567 카드 1234-****-****-5678 연락처 010-9876-5432 user@example.com sk-secret123456 2.3만원";
		const preview = redactInputPreview(raw, 200);

		expect(preview).not.toContain("4500");
		expect(preview).not.toContain("3333");
		expect(preview).not.toContain("1234567");
		expect(preview).not.toContain("5678");
		expect(preview).not.toContain("010");
		expect(preview).not.toContain("user@example.com");
		expect(preview).not.toContain("sk-secret123456");
		expect(preview).not.toContain("2.3");
		expect(preview).not.toMatch(/\d/);
		expect(preview).toContain("[AMOUNT]");
		expect(preview).toContain("[ACCOUNT]");
		expect(preview).toContain("[EMAIL]");
		expect(preview).toContain("[SECRET]");
	});

	it("produces a deterministic 64-char SHA-256 hex digest", () => {
		const digestA = hashInput("스타벅스 4500원");
		const digestB = hashInput("스타벅스 4500원");
		const digestC = hashInput("스타벅스 5000원");

		expect(digestA).toMatch(/^[a-f0-9]{64}$/);
		expect(digestA).toBe(digestB);
		expect(digestA).not.toBe(digestC);
	});

	it("sanitizes error messages containing secrets, URLs, or digit sequences", () => {
		const sanitized = sanitizeErrorMessage(
			"401 Unauthorized Bearer secret_token_xyz at https://api.example.com/v1/chat?api_key=secret123 card 1234-5678-9012-3456",
		);

		expect(sanitized).not.toContain("secret_token_xyz");
		expect(sanitized).not.toContain("secret123");
		expect(sanitized).not.toContain("1234-5678-9012-3456");
		expect(sanitized).toContain("[SECRET]");
		expect(sanitized).toContain("https://api.example.com/v1/chat?[REDACTED]");
	});
});

describe("parseUnifiedText & parseUnifiedImage structured telemetry", () => {
	it("logs structured success telemetry with parseRequestId, tokens, and redacted preview", async () => {
		const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
		const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
		const attempts: LlmAttemptTelemetry[] = [];
		const parseRequestId = createParseRequestId();

		const mockClient = {
			chat: {
				completions: {
					create: async () => ({
						choices: [{ message: { content: VALID_TEXT_JSON } }],
						usage: {
							prompt_tokens: 910,
							completion_tokens: 85,
							total_tokens: 995,
						},
					}),
				},
			},
		} as unknown as LLMChatClient;

		const result = await parseUnifiedText(
			"스타벅스 4500원 신한카드 1234-5678-9012-3456",
			SAMPLE_CATEGORIES,
			[],
			"kimi",
			{
				parseRequestId,
				today: "2026-08-18",
				onAttempt: (entry) => attempts.push(entry),
				configOverride: {
					provider: "kimi",
					client: mockClient,
					model: "kimi-k3",
					temperature: 1,
				},
			},
		);

		expect(result.success).toBe(true);
		expect(attempts).toHaveLength(1);
		expect(attempts[0]).toMatchObject({
			parseRequestId,
			route: "text",
			provider: "kimi",
			model: "kimi-k3",
			attempt: 1,
			result: "success",
			tokens: {
				promptTokens: 910,
				completionTokens: 85,
				totalTokens: 995,
			},
			errorName: null,
			errorMessage: null,
			errorCode: null,
			httpStatus: null,
			abortReason: null,
		});
		expect(attempts[0].inputHash).toBe(
			hashInput("스타벅스 4500원 신한카드 1234-5678-9012-3456"),
		);
		expect(attempts[0].inputPreview).not.toMatch(/\d/);
		expect(infoSpy).toHaveBeenCalledWith("[LLM] text parse attempt", attempts[0]);
		expect(debugSpy).not.toHaveBeenCalled();
	});

	it("omits tokens when API response omits usage and captures image route telemetry", async () => {
		const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
		const attempts: LlmAttemptTelemetry[] = [];
		const parseRequestId = createParseRequestId();

		const mockClient = {
			chat: {
				completions: {
					create: async () => ({
						choices: [{ message: { content: VALID_TEXT_JSON } }],
					}),
				},
			},
		} as unknown as LLMChatClient;

		const result = await parseUnifiedImage(
			"ZmFrZS1pbWFnZS1iYXNlNjQ=",
			"image/png",
			"영수증 12000원",
			SAMPLE_CATEGORIES,
			[],
			"fireworks",
			{
				parseRequestId,
				today: "2026-08-18",
				onAttempt: (entry) => attempts.push(entry),
				configOverride: {
					provider: "fireworks",
					client: mockClient,
					model: "accounts/fireworks/models/kimi-k3",
					temperature: 1,
				},
			},
		);

		expect(result.success).toBe(true);
		expect(attempts).toHaveLength(1);
		expect(attempts[0].route).toBe("image");
		expect(attempts[0].provider).toBe("fireworks");
		expect(attempts[0].tokens).toBeUndefined();
		expect(attempts[0].inputPreview).not.toContain("12000");
		expect(infoSpy).toHaveBeenCalledTimes(1);
	});

	it("captures httpStatus, errorCode, sanitized errorMessage, and abortReason on failures", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const attempts: LlmAttemptTelemetry[] = [];

		// 1. HTTP 429 API error containing sensitive token text
		const rateLimitError = Object.assign(
			new Error("Rate limit exceeded for Bearer secret_key_999 1234-5678-9012-3456"),
			{ status: 429, code: "rate_limit_exceeded" },
		);
		rateLimitError.name = "APIError";

		const failingClient = {
			chat: {
				completions: {
					create: async () => {
						throw rateLimitError;
					},
				},
			},
		} as unknown as LLMChatClient;

		const apiFailure = await parseUnifiedText("CU 3500원", SAMPLE_CATEGORIES, [], "kimi", {
			parseRequestId: "req-api-429",
			onAttempt: (entry) => attempts.push(entry),
			configOverride: {
				provider: "kimi",
				client: failingClient,
				model: "kimi-k3",
				temperature: 1,
			},
		});

		expect(apiFailure.success).toBe(false);
		expect(attempts[0]).toMatchObject({
			parseRequestId: "req-api-429",
			result: "error",
			errorName: "APIError",
			errorCode: "rate_limit_exceeded",
			httpStatus: 429,
			abortReason: null,
		});
		expect(attempts[0].errorMessage).not.toContain("secret_key_999");
		expect(attempts[0].errorMessage).not.toContain("1234-5678-9012-3456");

		// 2. External abort signal
		const controller = new AbortController();
		controller.abort(new Error("race loser cancelled"));

		const abortedClient = {
			chat: {
				completions: {
					create: async () => ({
						choices: [{ message: { content: VALID_TEXT_JSON } }],
					}),
				},
			},
		} as unknown as LLMChatClient;

		const abortFailure = await parseUnifiedText("CU 3500원", SAMPLE_CATEGORIES, [], "minimax", {
			parseRequestId: "req-abort",
			signal: controller.signal,
			onAttempt: (entry) => attempts.push(entry),
			configOverride: {
				provider: "minimax",
				client: abortedClient,
				model: "MiniMax-M2.5",
				temperature: 1,
			},
		});

		expect(abortFailure.success).toBe(false);
		expect(attempts[1]).toMatchObject({
			parseRequestId: "req-abort",
			result: "aborted",
			errorCode: "aborted",
			abortReason: "race loser cancelled",
		});

		// 3. Timeout error
		const timeoutClient = {
			chat: {
				completions: {
					create: async () => {
						throw new LLMTimeoutError();
					},
				},
			},
		} as unknown as LLMChatClient;

		const timeoutFailure = await parseUnifiedText("CU 3500원", SAMPLE_CATEGORIES, [], "kimi", {
			parseRequestId: "req-timeout",
			onAttempt: (entry) => attempts.push(entry),
			configOverride: {
				provider: "kimi",
				client: timeoutClient,
				model: "kimi-k3",
				temperature: 1,
			},
		});

		expect(timeoutFailure.success).toBe(false);
		expect(attempts[2]).toMatchObject({
			parseRequestId: "req-timeout",
			result: "timeout",
			errorName: "LLMTimeoutError",
			errorCode: "timeout",
		});

		// 4. Schema error with usage
		const schemaClient = {
			chat: {
				completions: {
					create: async () => ({
						choices: [{ message: { content: "not json" } }],
						usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 },
					}),
				},
			},
		} as unknown as LLMChatClient;

		const schemaFailure = await parseUnifiedText("CU 3500원", SAMPLE_CATEGORIES, [], "kimi", {
			parseRequestId: "req-schema",
			onAttempt: (entry) => attempts.push(entry),
			configOverride: {
				provider: "kimi",
				client: schemaClient,
				model: "kimi-k3",
				temperature: 1,
			},
		});

		expect(schemaFailure.success).toBe(false);
		expect(attempts[3]).toMatchObject({
			parseRequestId: "req-schema",
			result: "schema_error",
			errorName: "ParseSchemaError",
			errorCode: "schema",
			tokens: {
				promptTokens: 100,
				completionTokens: 10,
				totalTokens: 110,
			},
		});
		expect(warnSpy).toHaveBeenCalledTimes(4);

		// Aggregate failure log correlation check across multiple drop-out reasons
		const aggregate = buildAggregateFailureLog({
			parseRequestId: "req-agg",
			route: "text",
			inputHash: hashInput("CU 3500원"),
			inputPreview: redactInputPreview("CU 3500원"),
			attempts,
		});
		expect(aggregate.totalAttempts).toBe(4);
		expect(aggregate.attempts.map((a) => a.result)).toEqual([
			"error",
			"aborted",
			"timeout",
			"schema_error",
		]);
		expect(aggregate.attempts[0].reason).toContain("HTTP 429");
		expect(aggregate.attempts[2].reason).toContain("timeout");
	});

	it("logs raw input and prompt ONLY when LLM_DEBUG_LOG_RAW === '1'", async () => {
		vi.spyOn(console, "info").mockImplementation(() => {});
		const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

		const mockClient = {
			chat: {
				completions: {
					create: async () => ({
						choices: [{ message: { content: VALID_TEXT_JSON } }],
					}),
				},
			},
		} as unknown as LLMChatClient;

		const rawInput = "비밀메모 스타벅스 4500원";

		process.env.LLM_DEBUG_LOG_RAW = "0";
		await parseUnifiedText(rawInput, SAMPLE_CATEGORIES, [], "kimi", {
			parseRequestId: "req-debug-off",
			configOverride: {
				provider: "kimi",
				client: mockClient,
				model: "kimi-k3",
				temperature: 1,
			},
		});
		expect(debugSpy).not.toHaveBeenCalled();

		process.env.LLM_DEBUG_LOG_RAW = "1";
		await parseUnifiedText(rawInput, SAMPLE_CATEGORIES, [], "kimi", {
			parseRequestId: "req-debug-on",
			configOverride: {
				provider: "kimi",
				client: mockClient,
				model: "kimi-k3",
				temperature: 1,
			},
		});
		expect(debugSpy).toHaveBeenCalledTimes(1);
		expect(debugSpy.mock.calls[0][1]).toMatchObject({
			parseRequestId: "req-debug-on",
			route: "text",
			rawInput,
		});
	});
});
