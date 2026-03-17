// LLM API 호출 + 응답 파싱 계층
// parse-core.ts에서 호출되며, prompt.ts의 프롬프트를 조립하여 LLM에 전송하고 응답을 타입 안전한 객체로 변환한다.
// 흐름: prompt.ts(프롬프트 생성) → index.ts(API 호출 + 응답 파싱) → parse-core.ts(폴백/에러 처리)
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { getLLMConfig } from "./client";
import type { LLMProvider } from "./client";
import { buildSystemPrompt, buildUserPrompt, buildImageUserPrompt } from "./prompt";
import type { LLMCategory } from "./prompt";
import type {
	ParsedTransaction,
	ParsedAccount,
	UnifiedParseResponse,
} from "./types";
import type { Account } from "@/types";
import { getTodayString } from "@/lib/format";

// 커스텀 에러 클래스 — 문자열 비교 대신 instanceof 사용 (M6)
export class LLMTimeoutError extends Error {
	constructor(message = "LLM 응답 시간 초과") {
		super(message);
		this.name = "LLMTimeoutError";
	}
}

const VALID_ACCOUNT_TYPES = new Set(["asset", "debt"]);
const VALID_SUB_TYPES = new Set(["bank", "cash", "savings", "investment", "credit_card", "loan", "other"]);

// MiniMax M2.5는 content 앞에 <think>...</think>를 섞어 반환할 수 있어 JSON 추출 전에 제거한다.
function stripReasoningBlocks(text: string): string {
	return text.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();
}

// LLM 응답에서 JSON 추출 — 마크다운 코드블록, 객체, 배열 순으로 시도
// "```json\n{...}\n```"  → "{...}"     (코드블록 안의 JSON)
// "다음은 결과: {...}"   → "{...}"     (객체 직접 추출)
// "[{...}]"              → "[{...}]"   (배열 하위 호환)
function extractJSON(text: string): string {
	const normalized = stripReasoningBlocks(text);
	const fenced = normalized.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (fenced) return fenced[1].trim();

	const objectMatch = normalized.match(/\{[\s\S]*\}/);
	if (objectMatch) return objectMatch[0].trim();

	const arrayMatch = normalized.match(/\[[\s\S]*\]/);
	if (arrayMatch) return arrayMatch[0].trim();

	return normalized.trim();
}

// 거래 항목 검증: 필수 필드 유무, type 유효성, 금액 양수 체크
// [{date:"2026-03-10",type:"expense",category:"식비",description:"CU",amount:3500}] → ParsedTransaction[]
function validateTransactions(data: unknown): ParsedTransaction[] {
	if (!Array.isArray(data)) return [];

	return data.map((item, i) => {
		if (!item.date || !item.type || !item.category || !item.description || item.amount == null) {
			throw new Error(`거래 항목 ${i + 1}에 필수 필드가 누락되었습니다.`);
		}
		if (item.type !== "income" && item.type !== "expense") {
			throw new Error(`거래 항목 ${i + 1}의 type이 유효하지 않습니다: ${item.type}`);
		}
		if (typeof item.amount !== "number" || item.amount <= 0) {
			throw new Error(`거래 항목 ${i + 1}의 금액이 유효하지 않습니다: ${item.amount}`);
		}

		const result: ParsedTransaction = {
			date: String(item.date),
			type: item.type as "income" | "expense",
			category: String(item.category),
			description: String(item.description),
			amount: Number(item.amount),
		};

		if (item.isRecurring === true) {
			result.isRecurring = true;
			result.dayOfMonth = typeof item.dayOfMonth === "number" ? item.dayOfMonth : undefined;
		}

		if (typeof item.suggestedCategory === "string" && item.suggestedCategory.trim()) {
			result.suggestedCategory = item.suggestedCategory.trim();
		}

		return result;
	});
}

// 계정 항목 검증: type(asset/debt), subType, balance 유효성 체크
// [{name:"카카오뱅크",type:"asset",subType:"bank",balance:1500000}] → ParsedAccount[]
function validateAccounts(data: unknown): ParsedAccount[] {
	if (!Array.isArray(data)) return [];

	return data.map((item, i) => {
		if (!item.name || !item.type || !item.subType || item.balance == null) {
			throw new Error(`계정 항목 ${i + 1}에 필수 필드가 누락되었습니다.`);
		}
		if (!VALID_ACCOUNT_TYPES.has(item.type)) {
			throw new Error(`계정 항목 ${i + 1}의 type이 유효하지 않습니다: ${item.type}`);
		}
		if (!VALID_SUB_TYPES.has(item.subType)) {
			throw new Error(`계정 항목 ${i + 1}의 subType이 유효하지 않습니다: ${item.subType}`);
		}

		return {
			name: String(item.name).trim(),
			type: item.type as "asset" | "debt",
			subType: item.subType as ParsedAccount["subType"],
			icon: typeof item.icon === "string" ? item.icon : "🏦",
			balance: Math.abs(Number(item.balance)),
		};
	});
}

// LLM JSON 응답을 intent + transactions + accounts로 분리
// 예시 1 — 거래: {intent:"transaction", transactions:[{date:"2026-03-10",type:"expense",...}], accounts:[]}
//   → { intent:"transaction", transactions: ParsedTransaction[], accounts: [] }
// 예시 2 — 계정: {intent:"account", transactions:[], accounts:[{name:"카카오뱅크",type:"asset",...}]}
//   → { intent:"account", transactions: [], accounts: ParsedAccount[] }
// 예시 3 — OOD: {rejected:true, reason:"가계부와 관련 없는 입력입니다."}
//   → throw Error("가계부와 관련 없는 입력입니다.")
// 예시 4 — 하위호환(배열): [{date:"2026-03-10",...}] → intent:"transaction"으로 간주
function parseUnifiedResponse(parsed: unknown): { intent: "transaction" | "account"; transactions: ParsedTransaction[]; accounts: ParsedAccount[] } {
	// 새 통합 포맷: { intent, transactions, accounts }
	if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
		const obj = parsed as Record<string, unknown>;

		// LLM이 OOD로 거부한 경우
		if (obj.rejected === true) {
			const reason = typeof obj.reason === "string" ? obj.reason : "가계부와 관련된 내용을 입력해 주세요.";
			throw new Error(reason);
		}

		const intent = (obj.intent === "account" ? "account" : "transaction") as "transaction" | "account";
		const transactions = validateTransactions(obj.transactions);
		const accounts = validateAccounts(obj.accounts);

		if (transactions.length === 0 && accounts.length === 0) {
			throw new Error("파싱 결과가 비어 있습니다.");
		}

		return { intent, transactions, accounts };
	}

	// 하위 호환: 배열 형태 → 거래로 간주
	if (Array.isArray(parsed)) {
		const transactions = validateTransactions(parsed);
		return { intent: "transaction", transactions, accounts: [] };
	}

	throw new Error("LLM 응답 형식을 인식할 수 없습니다.");
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
 *   → extractJSON() → '{"intent":"transaction","transactions":[...]}'
 *   → JSON.parse() → { intent:"transaction", transactions:[...], accounts:[] }
 *   → parseUnifiedResponse() → 검증 후 { intent, transactions:ParsedTransaction[], accounts:[] }
 *   → return { success:true, intent:"transaction", transactions:[...], accounts:[] }
 */
export async function parseUnifiedText(
	input: string,
	categories: LLMCategory[],
	existingAccounts: Account[] = [],
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
				...extra_body,
			}, { signal }),
			timeoutMs,
			options?.signal,
		);

		const content = response.choices[0]?.message?.content;
		if (!content) {
			throw new Error("LLM 응답이 비어 있습니다.");
		}

		const jsonStr = extractJSON(content);
		const parsed = JSON.parse(jsonStr);
		const result = parseUnifiedResponse(parsed);

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
 *   → 이후 흐름은 parseUnifiedText와 동일 (extractJSON → JSON.parse → parseUnifiedResponse)
 */
export async function parseUnifiedImage(
	imageBase64: string,
	mimeType: string,
	textInput: string,
	categories: LLMCategory[],
	existingAccounts: Account[] = [],
	provider?: LLMProvider,
	options?: { timeoutMs?: number },
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
		// 사용자 1회 요청은 벤더 1회 호출만 수행한다.
		const response = await withTimeout(
			(signal) => client.chat.completions.create({
				model,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userContent },
				],
				temperature,
				...extra_body,
			}, { signal }),
			timeoutMs,
		);

		const content = response.choices[0]?.message?.content;
		if (!content) {
			throw new Error("LLM 응답이 비어 있습니다.");
		}

		const jsonStr = extractJSON(content);
		const parsed = JSON.parse(jsonStr);
		const result = parseUnifiedResponse(parsed);

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
