import { createHash, randomUUID } from "node:crypto";

import type { LLMProvider } from "./models";

export type LlmRoute = "text" | "image";

export type LlmAttemptResult =
	| "success"
	| "timeout"
	| "aborted"
	| "schema_error"
	| "empty_response"
	| "error";

export interface LlmTokenUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
}

export interface LlmAttemptTelemetry {
	parseRequestId: string;
	route: LlmRoute;
	provider: LLMProvider;
	model: string;
	attempt: number;
	timeoutMs: number;
	elapsedMs: number;
	result: LlmAttemptResult;
	tokens?: LlmTokenUsage;
	errorName: string | null;
	errorMessage: string | null;
	errorCode: string | null;
	httpStatus: number | null;
	abortReason: string | null;
	inputHash: string;
	inputPreview: string;
}

export interface LlmAggregateAttemptSummary {
	provider: LLMProvider;
	model: string;
	attempt: number;
	result: LlmAttemptResult;
	elapsedMs: number;
	timeoutMs: number;
	errorName: string | null;
	errorMessage: string | null;
	errorCode: string | null;
	httpStatus: number | null;
	abortReason: string | null;
	reason: string;
}

export interface LlmAggregateFailureLog {
	parseRequestId: string;
	route: LlmRoute;
	totalAttempts: number;
	inputHash: string;
	inputPreview: string;
	attempts: LlmAggregateAttemptSummary[];
}

export interface RawUsageLike {
	prompt_tokens?: number | null;
	completion_tokens?: number | null;
	total_tokens?: number | null;
}

const SECRET_PATTERNS: RegExp[] = [
	/Bearer\s+[A-Za-z0-9._-]+/gi,
	/\bsk-[A-Za-z0-9_-]{6,}\b/g,
	/\b(?:api[_-]?key|token|secret|password|passwd|auth)\s*[:=]\s*[^\s,;]+/gi,
];

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const RRN_PATTERN = /\b\d{6}-?\d{7}\b/g;
// 카드번호(4-4-4-4), 계좌번호(3-3-6 등), 전화번호(010-1234-5678), 마스킹된 카드/계좌 패턴
const CARD_OR_ACCOUNT_PATTERN =
	/(?:\d{2,6}(?:[-*]\d{1,6}|[-*]+\*+|\*+[-*]?\d{1,6})+|\*{2,}[-*]?\d{2,6}|\d{2,6}[-*]?\*{2,})/g;
// 한국어 금액 단위 표기 ("1,500,000원", "2.3만", "1억 2천", "9천원" 등)
const KOREAN_AMOUNT_PATTERN =
	/\d[\d,.]*(?:\s*억(?:\s*\d[\d,.]*\s*천)?)?\s*(?:만\s*원|천\s*원|백만\s*원|만원|천원|원|만|천)/g;
const REMAINING_DIGITS_PATTERN = /\d[\d,.]*/g;

export function createParseRequestId(): string {
	return randomUUID();
}

export function isRawDebugLoggingEnabled(): boolean {
	return process.env.LLM_DEBUG_LOG_RAW === "1";
}

export function hashInput(input: string): string {
	return createHash("sha256").update(input, "utf8").digest("hex");
}

export function redactInputPreview(input: string, maxLength = 80): string {
	let text = input;

	for (const pattern of SECRET_PATTERNS) {
		text = text.replace(pattern, "[SECRET]");
	}

	text = text
		.replace(EMAIL_PATTERN, "[EMAIL]")
		.replace(RRN_PATTERN, "[ID]")
		.replace(CARD_OR_ACCOUNT_PATTERN, "[ACCOUNT]")
		.replace(KOREAN_AMOUNT_PATTERN, "[AMOUNT]")
		.replace(REMAINING_DIGITS_PATTERN, "[NUM]")
		.replace(/\s+/g, " ")
		.trim();

	if (text.length <= maxLength) {
		return text;
	}

	return `${text.slice(0, maxLength)}...`;
}

export function sanitizeErrorMessage(message: string, maxLength = 300): string {
	let text = message;

	for (const pattern of SECRET_PATTERNS) {
		text = text.replace(pattern, "[SECRET]");
	}

	text = text
		.replace(/https?:\/\/[^\s?#]+\?[^\s#]+/gi, (match) => `${match.split("?")[0]}?[REDACTED]`)
		.replace(EMAIL_PATTERN, "[EMAIL]")
		.replace(RRN_PATTERN, "[ID]")
		.replace(CARD_OR_ACCOUNT_PATTERN, "[ACCOUNT]")
		.replace(/\d{3,}/g, "[REDACTED]")
		.replace(/\s+/g, " ")
		.trim();

	if (text.length <= maxLength) {
		return text;
	}

	return `${text.slice(0, maxLength)}...`;
}

export function extractTokenUsage(usage?: RawUsageLike | null): LlmTokenUsage | undefined {
	if (!usage) return undefined;

	const promptTokens = typeof usage.prompt_tokens === "number" && Number.isFinite(usage.prompt_tokens)
		? usage.prompt_tokens
		: undefined;
	const completionTokens = typeof usage.completion_tokens === "number" && Number.isFinite(usage.completion_tokens)
		? usage.completion_tokens
		: undefined;
	const totalTokens = typeof usage.total_tokens === "number" && Number.isFinite(usage.total_tokens)
		? usage.total_tokens
		: undefined;

	if (promptTokens === undefined && completionTokens === undefined && totalTokens === undefined) {
		return undefined;
	}

	const resolvedPrompt = promptTokens ?? 0;
	const resolvedCompletion = completionTokens ?? 0;

	return {
		promptTokens: resolvedPrompt,
		completionTokens: resolvedCompletion,
		totalTokens: totalTokens ?? resolvedPrompt + resolvedCompletion,
	};
}

function resolveAbortReasonText(reason: unknown): string | null {
	if (reason == null) return null;
	if (reason instanceof Error) {
		return sanitizeErrorMessage(reason.message || reason.name);
	}
	if (typeof reason === "string") {
		return sanitizeErrorMessage(reason);
	}
	return sanitizeErrorMessage(String(reason));
}

export function extractErrorTelemetry(
	error: unknown,
	externalSignal?: AbortSignal,
): {
	result: Exclude<LlmAttemptResult, "success">;
	errorName: string;
	errorMessage: string;
	errorCode: string | null;
	httpStatus: number | null;
	abortReason: string | null;
} {
	const errorObj = error instanceof Error ? error : null;
	const errorName = errorObj?.name || "Error";
	const rawMessage = errorObj?.message ?? String(error);
	const errorMessage = sanitizeErrorMessage(rawMessage);

	const statusCandidate = (error as { status?: unknown } | null)?.status;
	const httpStatus =
		typeof statusCandidate === "number" && Number.isFinite(statusCandidate)
			? statusCandidate
			: null;

	const codeCandidate = (error as { code?: unknown } | null)?.code;
	const rawCode =
		typeof codeCandidate === "string" || typeof codeCandidate === "number"
			? String(codeCandidate)
			: null;

	if (externalSignal?.aborted) {
		return {
			result: "aborted",
			errorName,
			errorMessage,
			errorCode: rawCode ?? "aborted",
			httpStatus,
			abortReason: resolveAbortReasonText(externalSignal.reason) ?? errorMessage,
		};
	}

	if (errorName === "LLMTimeoutError") {
		return {
			result: "timeout",
			errorName,
			errorMessage,
			errorCode: rawCode ?? "timeout",
			httpStatus,
			abortReason: errorMessage,
		};
	}

	if (errorName === "AbortError") {
		return {
			result: "aborted",
			errorName,
			errorMessage,
			errorCode: rawCode ?? "aborted",
			httpStatus,
			abortReason: errorMessage,
		};
	}

	if (errorName === "ParseSchemaError" || rawCode === "schema") {
		return {
			result: "schema_error",
			errorName,
			errorMessage,
			errorCode: rawCode ?? "schema",
			httpStatus,
			abortReason: null,
		};
	}

	if (rawMessage === "LLM 응답이 비어 있습니다.") {
		return {
			result: "empty_response",
			errorName,
			errorMessage,
			errorCode: rawCode ?? "empty_response",
			httpStatus,
			abortReason: null,
		};
	}

	return {
		result: "error",
		errorName,
		errorMessage,
		errorCode: rawCode ?? (httpStatus !== null ? `http_${httpStatus}` : null),
		httpStatus,
		abortReason: null,
	};
}

export function formatAttemptDropOutReason(attempt: LlmAttemptTelemetry): string {
	const parts: string[] = [attempt.result];
	if (attempt.httpStatus !== null) {
		parts.push(`HTTP ${attempt.httpStatus}`);
	}
	if (attempt.errorCode) {
		parts.push(`code=${attempt.errorCode}`);
	}
	const detail = attempt.abortReason || attempt.errorMessage;
	return detail ? `${parts.join(" ")}: ${detail}` : parts.join(" ");
}

export function buildAggregateFailureLog(params: {
	parseRequestId: string;
	route: LlmRoute;
	inputHash: string;
	inputPreview: string;
	attempts: LlmAttemptTelemetry[];
}): LlmAggregateFailureLog {
	return {
		parseRequestId: params.parseRequestId,
		route: params.route,
		totalAttempts: params.attempts.length,
		inputHash: params.inputHash,
		inputPreview: params.inputPreview,
		attempts: params.attempts.map((attempt) => ({
			provider: attempt.provider,
			model: attempt.model,
			attempt: attempt.attempt,
			result: attempt.result,
			elapsedMs: attempt.elapsedMs,
			timeoutMs: attempt.timeoutMs,
			errorName: attempt.errorName,
			errorMessage: attempt.errorMessage,
			errorCode: attempt.errorCode,
			httpStatus: attempt.httpStatus,
			abortReason: attempt.abortReason,
			reason: formatAttemptDropOutReason(attempt),
		})),
	};
}
