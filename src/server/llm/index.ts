// LLM API 호출 + 응답 파싱 계층
// parse-core.ts에서 호출되며, prompt.ts의 프롬프트를 조립하여 LLM에 전송하고 응답을 타입 안전한 객체로 변환한다.
// 흐름: prompt.ts(프롬프트 생성) → index.ts(structured output 호출 + schema parse) → parse-core.ts
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { getLLMConfig } from "./client";
import type { LLMConfig, LLMProvider } from "./client";
import { buildSystemPrompt, buildUserPrompt, buildImageUserPrompt } from "./prompt";
import type { LLMCategory } from "./prompt";
import type { UnifiedParseResponse } from "./types";
import type { Account } from "@/types";
import { getTodayString } from "@/lib/format";
import { LLM_PARSE_RESPONSE_FORMAT, parseLlmContent } from "./parse-schema";
import {
	createParseRequestId,
	extractErrorTelemetry,
	extractTokenUsage,
	hashInput,
	isRawDebugLoggingEnabled,
	redactInputPreview,
	type LlmAttemptTelemetry,
	type LlmRoute,
	type RawUsageLike,
} from "./telemetry";

export interface ParseUnifiedOptions {
	timeoutMs?: number;
	signal?: AbortSignal;
	parseRequestId?: string;
	today?: string;
	onAttempt?: (telemetry: LlmAttemptTelemetry) => void;
	configOverride?: Pick<LLMConfig, "client" | "model" | "temperature" | "extra_body"> & {
		provider?: LLMProvider;
	};
}

// 커스텀 에러 클래스 — 문자열 비교 대신 instanceof 사용 (M6)
export class LLMTimeoutError extends Error {
	constructor(message = "LLM 응답 시간 초과") {
		super(message);
		this.name = "LLMTimeoutError";
	}
}

// 타임아웃시 AbortSignal로 HTTP 요청 자체를 취소하여 "늦은 200 OK" 유령 응답을 방지
// withTimeout(fn, 45000) → 45초 내 응답 없으면 LLMTimeoutError throw
// externalSignal이 전달되면 외부에서도 abort 가능 (동시 경쟁 패자 취소용)
async function withTimeout<T>(
	task: (signal: AbortSignal) => Promise<T>,
	ms: number,
	externalSignal?: AbortSignal,
): Promise<T> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		controller.abort(new LLMTimeoutError());
	}, ms);

	// 외부 signal(동시 경쟁 패자 취소)을 내부 controller에 연결
	function onExternalAbort() {
		controller.abort(externalSignal?.reason ?? new Error("external abort"));
	}
	if (externalSignal) {
		if (externalSignal.aborted) {
			clearTimeout(timeoutId);
			throw externalSignal.reason instanceof Error
				? externalSignal.reason
				: new Error("external abort");
		}
		externalSignal.addEventListener("abort", onExternalAbort, { once: true });
	}

	try {
		return await task(controller.signal);
	} catch (error) {
		// 외부 abort(레이스 패자)는 AbortError로 전파
		if (externalSignal?.aborted) {
			throw externalSignal.reason instanceof Error
				? externalSignal.reason
				: new Error("external abort");
		}

		if (controller.signal.aborted) {
			const reason = controller.signal.reason;
			if (reason instanceof Error) {
				throw reason;
			}
			throw new LLMTimeoutError();
		}

		throw error;
	} finally {
		clearTimeout(timeoutId);
		externalSignal?.removeEventListener("abort", onExternalAbort);
	}
}

function resolveTimeoutMs(timeoutMs?: number, fallback = 30000): number {
	if (timeoutMs == null || Number.isNaN(timeoutMs)) return fallback;
	return Math.max(15000, Math.min(timeoutMs, 120000));
}

function getElapsedMs(startedAt: number): number {
	return Date.now() - startedAt;
}

function resolveAttemptConfig(
	provider?: LLMProvider,
	configOverride?: ParseUnifiedOptions["configOverride"],
): LLMConfig {
	if (configOverride) {
		return {
			provider: configOverride.provider ?? provider ?? "kimi",
			client: configOverride.client,
			model: configOverride.model,
			temperature: configOverride.temperature,
			extra_body: configOverride.extra_body,
		};
	}

	return getLLMConfig(provider);
}

function emitRawDebugLog(params: {
	parseRequestId: string;
	route: LlmRoute;
	rawInput: string;
	systemPrompt: string;
	userPrompt: string;
}): void {
	if (!isRawDebugLoggingEnabled()) return;
	console.debug("[LLM] raw debug", params);
}

function emitAttemptSuccess(params: {
	parseRequestId: string;
	route: LlmRoute;
	provider: LLMProvider;
	model: string;
	attempt: number;
	timeoutMs: number;
	startedAt: number;
	usage?: RawUsageLike | null;
	inputHash: string;
	inputPreview: string;
	rawInput: string;
	systemPrompt: string;
	userPrompt: string;
	onAttempt?: (telemetry: LlmAttemptTelemetry) => void;
}): void {
	const tokens = extractTokenUsage(params.usage);
	const telemetry: LlmAttemptTelemetry = {
		parseRequestId: params.parseRequestId,
		route: params.route,
		provider: params.provider,
		model: params.model,
		attempt: params.attempt,
		timeoutMs: params.timeoutMs,
		elapsedMs: getElapsedMs(params.startedAt),
		result: "success",
		...(tokens ? { tokens } : {}),
		errorName: null,
		errorMessage: null,
		errorCode: null,
		httpStatus: null,
		abortReason: null,
		inputHash: params.inputHash,
		inputPreview: params.inputPreview,
	};

	console.info(`[LLM] ${params.route} parse attempt`, telemetry);
	emitRawDebugLog({
		parseRequestId: params.parseRequestId,
		route: params.route,
		rawInput: params.rawInput,
		systemPrompt: params.systemPrompt,
		userPrompt: params.userPrompt,
	});
	params.onAttempt?.(telemetry);
}

function emitAttemptFailure(params: {
	parseRequestId: string;
	route: LlmRoute;
	provider: LLMProvider;
	model: string;
	attempt: number;
	timeoutMs: number;
	startedAt: number;
	usage?: RawUsageLike | null;
	inputHash: string;
	inputPreview: string;
	rawInput: string;
	systemPrompt: string;
	userPrompt: string;
	error: unknown;
	signal?: AbortSignal;
	onAttempt?: (telemetry: LlmAttemptTelemetry) => void;
}): void {
	const tokens = extractTokenUsage(params.usage);
	const errorTelemetry = extractErrorTelemetry(params.error, params.signal);
	const telemetry: LlmAttemptTelemetry = {
		parseRequestId: params.parseRequestId,
		route: params.route,
		provider: params.provider,
		model: params.model,
		attempt: params.attempt,
		timeoutMs: params.timeoutMs,
		elapsedMs: getElapsedMs(params.startedAt),
		result: errorTelemetry.result,
		...(tokens ? { tokens } : {}),
		errorName: errorTelemetry.errorName,
		errorMessage: errorTelemetry.errorMessage,
		errorCode: errorTelemetry.errorCode,
		httpStatus: errorTelemetry.httpStatus,
		abortReason: errorTelemetry.abortReason,
		inputHash: params.inputHash,
		inputPreview: params.inputPreview,
	};

	console.warn(`[LLM] ${params.route} parse attempt failed`, telemetry);
	emitRawDebugLog({
		parseRequestId: params.parseRequestId,
		route: params.route,
		rawInput: params.rawInput,
		systemPrompt: params.systemPrompt,
		userPrompt: params.userPrompt,
	});
	params.onAttempt?.(telemetry);
}

/**
 * 텍스트 파싱 메인 — parse-core.ts에서 호출
 * input "CU 3500" + categories [{name:"식비",type:"expense"}, ...] + provider "minimax"
 *   → getLLMConfig("minimax") → { client, model:"MiniMax-M2.5", temperature:1 }
 *   → buildSystemPrompt() → "당신은 한국어 가계부...\n- 지출: 식비, 교통..." (3000자+)
 *   → buildUserPrompt() → "...\n[START]\nCU 3500\n[END]"
 *   → client.chat.completions.create() → LLM API 호출
 *   → response.choices[0].message.content
 *       = '```json\n{"intent":"transaction","transactions":[{"date":"2026-03-10",...}]}\n```'
 *   → parseLlmContent() → household-parse-v1 schema 검증
 *   → return { success:true, intent:"transaction", transactions:[...], accounts:[] }
 */
export async function parseUnifiedText(
	input: string,
	categories: LLMCategory[],
	existingAccounts: Array<Pick<Account, "name" | "type">> = [],
	provider?: LLMProvider,
	options?: ParseUnifiedOptions,
): Promise<UnifiedParseResponse> {
	const config = resolveAttemptConfig(provider, options?.configOverride);
	const today = options?.today ?? getTodayString();
	const timeoutMs = resolveTimeoutMs(options?.timeoutMs, 30000);
	const parseRequestId = options?.parseRequestId ?? createParseRequestId();

	const systemPrompt = buildSystemPrompt(categories, today, existingAccounts);
	const userPrompt = buildUserPrompt(input);
	const inputHash = hashInput(input);
	const inputPreview = redactInputPreview(input);
	const attempt = 1;
	const startedAt = Date.now();
	let usage: RawUsageLike | null | undefined;

	try {
		// 외부에서 abort 될 수 있으면 빠르게 탈출
		if (options?.signal?.aborted) {
			throw options.signal.reason instanceof Error
				? options.signal.reason
				: new Error("external abort");
		}

		const response = await withTimeout(
			(signal) => config.client.chat.completions.create({
				model: config.model,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userPrompt },
				],
				temperature: config.temperature,
				response_format: LLM_PARSE_RESPONSE_FORMAT,
				...config.extra_body,
			}, { signal }),
			timeoutMs,
			options?.signal,
		);

		usage = response.usage;
		const content = response.choices[0]?.message?.content;
		if (!content) {
			throw new Error("LLM 응답이 비어 있습니다.");
		}

		const result = parseLlmContent(content);

		emitAttemptSuccess({
			parseRequestId,
			route: "text",
			provider: config.provider,
			model: config.model,
			attempt,
			timeoutMs,
			startedAt,
			usage,
			inputHash,
			inputPreview,
			rawInput: input,
			systemPrompt,
			userPrompt,
			onAttempt: options?.onAttempt,
		});

		return { success: true, ...result };
	} catch (error) {
		emitAttemptFailure({
			parseRequestId,
			route: "text",
			provider: config.provider,
			model: config.model,
			attempt,
			timeoutMs,
			startedAt,
			usage,
			inputHash,
			inputPreview,
			rawInput: input,
			systemPrompt,
			userPrompt,
			error,
			signal: options?.signal,
			onAttempt: options?.onAttempt,
		});

		const message = error instanceof Error ? error.message : "알 수 없는 오류";
		return { success: false, error: `파싱 실패: ${message}` };
	}
}

/**
 * 이미지 파싱 메인 — parse-core.ts에서 호출
 * imageBase64 "data:image/jpeg;base64,/9j/4AAQ..." + textInput "영수증" + provider "kimi"
 *   → messages.content = [{type:"image_url", image_url:{url:"data:..."} }, {type:"text", text:"첨부 이미지를...영수증..."}]
 *   → client.chat.completions.create() → LLM Vision API 호출
 *   → 이후 흐름은 parseUnifiedText와 동일 (structured output + schema parse)
 */
export async function parseUnifiedImage(
	imageBase64: string,
	mimeType: string,
	textInput: string,
	categories: LLMCategory[],
	existingAccounts: Array<Pick<Account, "name" | "type">> = [],
	provider?: LLMProvider,
	options?: ParseUnifiedOptions,
): Promise<UnifiedParseResponse> {
	const config = resolveAttemptConfig(provider, options?.configOverride);
	const today = options?.today ?? getTodayString();
	const timeoutMs = resolveTimeoutMs(options?.timeoutMs, 45000);
	const parseRequestId = options?.parseRequestId ?? createParseRequestId();

	const systemPrompt = buildSystemPrompt(categories, today, existingAccounts);
	const imageUserPrompt = buildImageUserPrompt(textInput);

	const userContent: ChatCompletionContentPart[] = [
		{
			type: "image_url",
			image_url: { url: `data:${mimeType};base64,${imageBase64}` },
		},
		{ type: "text", text: imageUserPrompt },
	];

	const inputHash = hashInput(textInput ? `${imageBase64}\n${textInput}` : imageBase64);
	const inputPreview = textInput.trim() ? redactInputPreview(textInput) : "[image]";
	const attempt = 1;
	const startedAt = Date.now();
	let usage: RawUsageLike | null | undefined;

	try {
		if (options?.signal?.aborted) {
			throw options.signal.reason instanceof Error
				? options.signal.reason
				: new Error("external abort");
		}

		const response = await withTimeout(
			(signal) => config.client.chat.completions.create({
				model: config.model,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userContent },
				],
				temperature: config.temperature,
				response_format: LLM_PARSE_RESPONSE_FORMAT,
				...config.extra_body,
			}, { signal }),
			timeoutMs,
			options?.signal,
		);

		usage = response.usage;
		const content = response.choices[0]?.message?.content;
		if (!content) {
			throw new Error("LLM 응답이 비어 있습니다.");
		}

		const result = parseLlmContent(content);

		emitAttemptSuccess({
			parseRequestId,
			route: "image",
			provider: config.provider,
			model: config.model,
			attempt,
			timeoutMs,
			startedAt,
			usage,
			inputHash,
			inputPreview,
			rawInput: textInput,
			systemPrompt,
			userPrompt: imageUserPrompt,
			onAttempt: options?.onAttempt,
		});

		return { success: true, ...result };
	} catch (error) {
		emitAttemptFailure({
			parseRequestId,
			route: "image",
			provider: config.provider,
			model: config.model,
			attempt,
			timeoutMs,
			startedAt,
			usage,
			inputHash,
			inputPreview,
			rawInput: textInput,
			systemPrompt,
			userPrompt: imageUserPrompt,
			error,
			signal: options?.signal,
			onAttempt: options?.onAttempt,
		});

		const message = error instanceof Error ? error.message : "알 수 없는 오류";
		return { success: false, error: `이미지 파싱 실패: ${message}` };
	}
}
