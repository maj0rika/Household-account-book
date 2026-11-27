import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockChatCreate } = vi.hoisted(() => ({
	mockChatCreate: vi.fn(),
}));

vi.mock("@/server/db", () => ({
	db: {
		select: () => ({
			from: (table: unknown) => ({
				where: async () => {
					if (
						table &&
						typeof table === "object" &&
						"isActive" in table
					) {
						return [{ name: "카카오뱅크", type: "asset" }];
					}
					return [
						{ name: "식비", type: "expense" },
						{ name: "카페/간식", type: "expense" },
						{ name: "급여", type: "income" },
					];
				},
			}),
		}),
	},
}));

vi.mock("@/server/lib/crypto", () => ({
	decryptString: (value: string) => value,
}));

vi.mock("@/server/llm/client", () => ({
	getLLMConfig: (provider?: "kimi" | "fireworks" | "minimax") => ({
		provider: provider ?? "kimi",
		model: provider === "fireworks" ? "accounts/fireworks/models/kimi-k3" : "kimi-k3",
		temperature: 1,
		client: {
			chat: {
				completions: {
					create: mockChatCreate,
				},
			},
		},
	}),
}));

import { executeImageParse, executeTextParse } from "../parse-core";
import type { LlmAggregateFailureLog, LlmAttemptTelemetry } from "@/server/llm/telemetry";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
	mockChatCreate.mockReset();
	process.env.KIMI_API_KEY = "dummy-kimi-key";
	process.env.FIREWORKS_API_KEY = "dummy-fw-key";
	delete process.env.LLM_PROVIDER;
	delete process.env.MINIMAX_API_KEY;
	delete process.env.LLM_DEBUG_LOG_RAW;
});

afterEach(() => {
	vi.restoreAllMocks();
	process.env = { ...ORIGINAL_ENV };
});

describe("parse-core parseRequestId propagation and aggregate failure logging", () => {
	it("generates unique parseRequestId per text request and propagates it to telemetry", async () => {
		const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
		mockChatCreate.mockResolvedValue({
			choices: [
				{
					message: {
						content: JSON.stringify({
							rejected: false,
							reason: "",
							intent: "transaction",
							transactions: [
								{
									date: "2026-08-18",
									type: "expense",
									category: "식비",
									description: "CU",
									amount: 3500,
									isRecurring: false,
									dayOfMonth: null,
									suggestedCategory: "",
								},
							],
							accounts: [],
						}),
					},
				},
			],
			usage: { prompt_tokens: 400, completion_tokens: 60, total_tokens: 460 },
		});

		const res1 = await executeTextParse("CU 3500원", "user-1", "sess-1");
		const res2 = await executeTextParse("CU 3500원", "user-1", "sess-1");

		expect(res1.success).toBe(true);
		expect(res2.success).toBe(true);
		expect(infoSpy).toHaveBeenCalledTimes(2);

		const log1 = infoSpy.mock.calls[0][1] as LlmAttemptTelemetry;
		const log2 = infoSpy.mock.calls[1][1] as LlmAttemptTelemetry;

		expect(log1.parseRequestId).toMatch(/^[0-9a-f-]{36}$/i);
		expect(log2.parseRequestId).toMatch(/^[0-9a-f-]{36}$/i);
		expect(log1.parseRequestId).not.toBe(log2.parseRequestId);
		expect(log1.route).toBe("text");
		expect(log1.tokens).toEqual({
			promptTokens: 400,
			completionTokens: 60,
			totalTokens: 460,
		});
	});

	it("emits an aggregate failure log under the same parseRequestId without silent fallback", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const apiError = Object.assign(new Error("Service unavailable 503"), {
			status: 503,
			code: "service_unavailable",
		});
		apiError.name = "APIError";
		mockChatCreate.mockRejectedValue(apiError);

		const result = await executeTextParse("스타벅스 4500원", "user-1", "sess-1");

		expect(result.success).toBe(false);
		// 무음 폴백 금지: 단일 provider 1회만 호출한다.
		expect(mockChatCreate).toHaveBeenCalledTimes(1);
		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(errorSpy).toHaveBeenCalledTimes(1);

		const attemptLog = warnSpy.mock.calls[0][1] as LlmAttemptTelemetry;
		const aggregateLog = errorSpy.mock.calls[0][1] as LlmAggregateFailureLog;

		expect(aggregateLog.parseRequestId).toBe(attemptLog.parseRequestId);
		expect(aggregateLog.route).toBe("text");
		expect(aggregateLog.totalAttempts).toBe(1);
		expect(aggregateLog.inputPreview).not.toContain("4500");
		expect(aggregateLog.attempts[0]).toMatchObject({
			provider: "kimi",
			result: "error",
			httpStatus: 503,
			errorCode: "service_unavailable",
		});
		expect(aggregateLog.attempts[0].reason).toContain("HTTP 503");
	});

	it("propagates parseRequestId and logs aggregate failure for image route", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const timeoutErr = Object.assign(new Error("LLM 응답 시간 초과"), {
			name: "LLMTimeoutError",
		});
		mockChatCreate.mockRejectedValue(timeoutErr);

		const result = await executeImageParse(
			"ZmFrZUltYWdl",
			"image/png",
			"영수증 15000원",
			"user-1",
			"sess-img-1",
		);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain("이미지 분석이 지연되고 있어요");
		}
		expect(mockChatCreate).toHaveBeenCalledTimes(1);

		const attemptLog = warnSpy.mock.calls[0][1] as LlmAttemptTelemetry;
		const aggregateLog = errorSpy.mock.calls[0][1] as LlmAggregateFailureLog;

		expect(attemptLog.route).toBe("image");
		expect(aggregateLog.parseRequestId).toBe(attemptLog.parseRequestId);
		expect(aggregateLog.route).toBe("image");
		expect(aggregateLog.attempts[0].result).toBe("timeout");
		expect(aggregateLog.inputPreview).not.toContain("15000");
	});

	it("short-circuits obvious OOD input before invoking LLM client", async () => {
		const result = await executeTextParse("오늘 서울 날씨 어때?", "user-1", "sess-1");

		expect(result.success).toBe(false);
		expect(mockChatCreate).not.toHaveBeenCalled();
	});
});
