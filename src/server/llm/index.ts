// LLM API 호출 + 응답 파싱 계층
// parse-core.ts에서 호출되며, prompt.ts의 프롬프트를 조립하여 LLM에 전송하고 응답을 타입 안전한 객체로 변환한다.
// 흐름: prompt.ts(프롬프트 생성) → index.ts(structured output 호출 + schema parse) → parse-core.ts
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { getLLMConfig } from "./client";
import type { LLMProvider } from "./client";
import { buildSystemPrompt, buildUserPrompt, buildImageUserPrompt } from "./prompt";
import type { LLMCategory } from "./prompt";
import type { UnifiedParseResponse } from "./types";
import type { Account } from "@/types";
import { getTodayString } from "@/lib/format";
import { LLM_PARSE_RESPONSE_FORMAT, parseLlmContent } from "./parse-schema";

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
	options?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<UnifiedParseResponse> {
	const { client, model, temperature, extra_body } = getLLMConfig(provider);
	const today = getTodayString();
	const timeoutMs = resolveTimeoutMs(options?.timeoutMs, 30000);
	const providerName = provider ?? "default";

	const systemPrompt = buildSystemPrompt(categories, today, existingAccounts);
	const userPrompt = buildUserPrompt(input);
	const attempt = 1;
	const startedAt = Date.now();

	try {
		// 외부에서 abort 될 수 있으면 빠르게 탈출
		if (options?.signal?.aborted) {
			throw new Error("external abort");
		}

		const response = await withTimeout(
			(signal) => client.chat.completions.create({
				model,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userPrompt },
				],
				temperature,
				response_format: LLM_PARSE_RESPONSE_FORMAT,
				...extra_body,
			}, { signal }),
			timeoutMs,
			options?.signal,
		);

		const content = response.choices[0]?.message?.content;
		if (!content) {
			throw new Error("LLM 응답이 비어 있습니다.");
		}

		const result = parseLlmContent(content);

		console.info("[LLM] text parse success", {
			provider: providerName,
			model,
			attempt,
			timeoutMs,
			elapsedMs: getElapsedMs(startedAt),
			inputLength: input.trim().length,
		});

		return { success: true, ...result };
	} catch (error) {
		console.warn("[LLM] text parse failed", {
			provider: providerName,
			model,
			attempt,
			timeoutMs,
			elapsedMs: getElapsedMs(startedAt),
			inputLength: input.trim().length,
			error: error instanceof Error ? error.message : String(error),
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
	options?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<UnifiedParseResponse> {
	const { client, model, temperature, extra_body } = getLLMConfig(provider);
	const today = getTodayString();
	const timeoutMs = resolveTimeoutMs(options?.timeoutMs, 45000);
	const providerName = provider ?? "default";

	const systemPrompt = buildSystemPrompt(categories, today, existingAccounts);

	const userContent: ChatCompletionContentPart[] = [
		{
			type: "image_url",
			image_url: { url: `data:${mimeType};base64,${imageBase64}` },
		},
	];

	userContent.push({ type: "text", text: buildImageUserPrompt(textInput) });
	const attempt = 1;
	const startedAt = Date.now();

	try {
		if (options?.signal?.aborted) {
			throw new Error("external abort");
		}

		const response = await withTimeout(
			(signal) => client.chat.completions.create({
				model,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userContent },
				],
				temperature,
				response_format: LLM_PARSE_RESPONSE_FORMAT,
				...extra_body,
			}, { signal }),
			timeoutMs,
			options?.signal,
		);

		const content = response.choices[0]?.message?.content;
		if (!content) {
			throw new Error("LLM 응답이 비어 있습니다.");
		}

		const result = parseLlmContent(content);

		console.info("[LLM] image parse success", {
			provider: providerName,
			model,
			attempt,
			timeoutMs,
			elapsedMs: getElapsedMs(startedAt),
			textLength: textInput.trim().length,
		});

		return { success: true, ...result };
	} catch (error) {
		console.warn("[LLM] image parse failed", {
			provider: providerName,
			model,
			attempt,
			timeoutMs,
			elapsedMs: getElapsedMs(startedAt),
			textLength: textInput.trim().length,
			error: error instanceof Error ? error.message : String(error),
		});

		const message = error instanceof Error ? error.message : "알 수 없는 오류";
		return { success: false, error: `이미지 파싱 실패: ${message}` };
	}
}
