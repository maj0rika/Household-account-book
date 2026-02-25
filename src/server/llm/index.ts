import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { getLLMConfig } from "./client";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import type { LLMCategory } from "./prompt";
import type { ParseResponse, ParsedTransaction } from "./types";

function extractJSON(text: string): string {
	// ```json ... ``` 블록 추출
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (fenced) return fenced[1].trim();

	// [ ... ] 배열 직접 추출
	const arrayMatch = text.match(/\[[\s\S]*\]/);
	if (arrayMatch) return arrayMatch[0].trim();

	return text.trim();
}

function validateTransactions(data: unknown): ParsedTransaction[] {
	if (!Array.isArray(data)) {
		throw new Error("LLM 응답이 배열이 아닙니다.");
	}

	return data.map((item, i) => {
		if (!item.date || !item.type || !item.category || !item.description || item.amount == null) {
			throw new Error(`항목 ${i + 1}에 필수 필드가 누락되었습니다.`);
		}
		if (item.type !== "income" && item.type !== "expense") {
			throw new Error(`항목 ${i + 1}의 type이 유효하지 않습니다: ${item.type}`);
		}
		if (typeof item.amount !== "number" || item.amount <= 0) {
			throw new Error(`항목 ${i + 1}의 금액이 유효하지 않습니다: ${item.amount}`);
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

export async function parseTransactionText(
	input: string,
	categories: LLMCategory[],
): Promise<ParseResponse> {
	const { client, model, temperature } = getLLMConfig();
	const today = new Date().toISOString().split("T")[0];

	const systemPrompt = buildSystemPrompt(categories, today);
	const userPrompt = buildUserPrompt(input);

	// 최대 2회 시도 (1회 실패 시 재시도)
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const response = await client.chat.completions.create({
				model,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userPrompt },
				],
				temperature,
			});

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new Error("LLM 응답이 비어 있습니다.");
			}

			const jsonStr = extractJSON(content);
			const parsed = JSON.parse(jsonStr);
			const transactions = validateTransactions(parsed);

			return { success: true, transactions };
		} catch (error) {
			// 마지막 시도에서 실패하면 에러 반환
			if (attempt === 1) {
				const message = error instanceof Error ? error.message : "알 수 없는 오류";
				return { success: false, error: `파싱 실패: ${message}` };
			}
			// 첫 시도 실패 시 재시도
		}
	}

	return { success: false, error: "파싱 실패: 최대 재시도 횟수를 초과했습니다." };
}

/**
 * 이미지(base64)를 Vision API로 파싱하여 거래 내역을 추출한다.
 * 텍스트와 이미지를 동시에 전달할 수 있다.
 */
export async function parseTransactionImage(
	imageBase64: string,
	mimeType: string,
	textInput: string,
	categories: LLMCategory[],
): Promise<ParseResponse> {
	const { client, model, temperature } = getLLMConfig();
	const today = new Date().toISOString().split("T")[0];

	const systemPrompt = buildSystemPrompt(categories, today);

	const userContent: ChatCompletionContentPart[] = [
		{
			type: "image_url",
			image_url: { url: `data:${mimeType};base64,${imageBase64}` },
		},
	];

	if (textInput.trim()) {
		userContent.push({ type: "text", text: textInput.trim() });
	} else {
		userContent.push({ type: "text", text: "이 이미지에서 거래 내역을 추출해주세요." });
	}

	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const response = await client.chat.completions.create({
				model,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userContent },
				],
				temperature,
			});

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new Error("LLM 응답이 비어 있습니다.");
			}

			const jsonStr = extractJSON(content);
			const parsed = JSON.parse(jsonStr);
			const transactions = validateTransactions(parsed);

			return { success: true, transactions };
		} catch (error) {
			if (attempt === 1) {
				const message = error instanceof Error ? error.message : "알 수 없는 오류";
				return { success: false, error: `이미지 파싱 실패: ${message}` };
			}
		}
	}

	return { success: false, error: "이미지 파싱 실패: 최대 재시도 횟수를 초과했습니다." };
}
