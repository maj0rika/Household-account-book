import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { getLLMConfig } from "./client";
import type { LLMProvider } from "./client";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import type { LLMCategory } from "./prompt";
import type {
	ParseResponse,
	ParsedTransaction,
	ParsedAccount,
	UnifiedParseResponse,
} from "./types";
import type { Account } from "@/types";

const VALID_ACCOUNT_TYPES = new Set(["asset", "debt"]);
const VALID_SUB_TYPES = new Set(["bank", "cash", "savings", "investment", "credit_card", "loan", "other"]);

function extractJSON(text: string): string {
	// ```json ... ``` 블록 추출
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (fenced) return fenced[1].trim();

	// { ... } 객체 직접 추출 (통합 응답은 객체)
	const objectMatch = text.match(/\{[\s\S]*\}/);
	if (objectMatch) return objectMatch[0].trim();

	// [ ... ] 배열 직접 추출 (하위 호환)
	const arrayMatch = text.match(/\[[\s\S]*\]/);
	if (arrayMatch) return arrayMatch[0].trim();

	return text.trim();
}

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

// 통합 응답 파싱 (객체 or 배열 하위호환)
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

// 타임아웃 래퍼
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return Promise.race([
		promise,
		new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error("LLM 응답 시간 초과")), ms),
		),
	]);
}

function resolveTimeoutMs(timeoutMs?: number, fallback = 30000): number {
	if (!timeoutMs || Number.isNaN(timeoutMs)) return fallback;
	return Math.max(15000, Math.min(timeoutMs, 120000));
}

/**
 * 통합 파싱: 텍스트 입력 → 거래 또는 자산/부채 자동 분기
 */
export async function parseUnifiedText(
	input: string,
	categories: LLMCategory[],
	existingAccounts: Account[] = [],
	provider?: LLMProvider,
	options?: { timeoutMs?: number },
): Promise<UnifiedParseResponse> {
	const { client, model, temperature, extra_body } = getLLMConfig(provider);
	const today = new Date().toISOString().split("T")[0];
	const timeoutMs = resolveTimeoutMs(options?.timeoutMs, 30000);

	const systemPrompt = buildSystemPrompt(categories, today, existingAccounts);
	const userPrompt = buildUserPrompt(input);

	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const response = await withTimeout(
				client.chat.completions.create({
					model,
					messages: [
						{ role: "system", content: systemPrompt },
						{ role: "user", content: userPrompt },
					],
					temperature,
					...extra_body,
				}),
				timeoutMs,
			);

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new Error("LLM 응답이 비어 있습니다.");
			}

			const jsonStr = extractJSON(content);
			const parsed = JSON.parse(jsonStr);
			const result = parseUnifiedResponse(parsed);

			return { success: true, ...result };
		} catch (error) {
			if (attempt === 1) {
				const message = error instanceof Error ? error.message : "알 수 없는 오류";
				return { success: false, error: `파싱 실패: ${message}` };
			}
		}
	}

	return { success: false, error: "파싱 실패: 최대 재시도 횟수를 초과했습니다." };
}

/**
 * 통합 파싱: 이미지 입력 → 거래 또는 자산/부채 자동 분기
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
	const today = new Date().toISOString().split("T")[0];
	const timeoutMs = resolveTimeoutMs(options?.timeoutMs, 45000);

	const systemPrompt = buildSystemPrompt(categories, today, existingAccounts);

	const userContent: ChatCompletionContentPart[] = [
		{
			type: "image_url",
			image_url: { url: `data:${mimeType};base64,${imageBase64}` },
		},
	];

	if (textInput.trim()) {
		userContent.push({ type: "text", text: textInput.trim() });
	} else {
		userContent.push({ type: "text", text: "이 이미지에서 거래 내역 또는 자산/부채 정보를 추출해주세요." });
	}

	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const response = await withTimeout(
				client.chat.completions.create({
					model,
					messages: [
						{ role: "system", content: systemPrompt },
						{ role: "user", content: userContent },
					],
					temperature,
					...extra_body,
				}),
				timeoutMs,
			);

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new Error("LLM 응답이 비어 있습니다.");
			}

			const jsonStr = extractJSON(content);
			const parsed = JSON.parse(jsonStr);
			const result = parseUnifiedResponse(parsed);

			return { success: true, ...result };
		} catch (error) {
			if (attempt === 1) {
				const message = error instanceof Error ? error.message : "알 수 없는 오류";
				return { success: false, error: `이미지 파싱 실패: ${message}` };
			}
		}
	}

	return { success: false, error: "이미지 파싱 실패: 최대 재시도 횟수를 초과했습니다." };
}

// --- 하위 호환: 기존 거래 전용 함수 유지 ---
export async function parseTransactionText(
	input: string,
	categories: LLMCategory[],
	provider?: LLMProvider,
): Promise<ParseResponse> {
	const result = await parseUnifiedText(input, categories, [], provider);
	if (!result.success) return result;
	return { success: true, transactions: result.transactions };
}

export async function parseTransactionImage(
	imageBase64: string,
	mimeType: string,
	textInput: string,
	categories: LLMCategory[],
	provider?: LLMProvider,
): Promise<ParseResponse> {
	const result = await parseUnifiedImage(imageBase64, mimeType, textInput, categories, [], provider);
	if (!result.success) return result;
	return { success: true, transactions: result.transactions };
}
