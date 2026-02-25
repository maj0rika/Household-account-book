"use server";

import { headers } from "next/headers";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { auth } from "@/server/auth";
import { parseTransactionText, parseTransactionImage } from "@/server/llm";
import { isBankMessage, preprocessBankMessage } from "@/server/llm/bank-message";
import type { ParseResponse } from "@/server/llm/types";

export async function parseTransactionInput(input: string): Promise<ParseResponse> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		return { success: false, error: "인증이 필요합니다." };
	}

	if (!input.trim()) {
		return { success: false, error: "입력이 비어 있습니다." };
	}

	const categories = DEFAULT_CATEGORIES;

	// 은행/카드 알림 메시지 감지 시 전처리
	const processedInput = isBankMessage(input)
		? preprocessBankMessage(input)
		: input;

	return parseTransactionText(processedInput, categories);
}

export async function parseTransactionImageInput(
	imageBase64: string,
	mimeType: string,
	textInput: string,
): Promise<ParseResponse> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		return { success: false, error: "인증이 필요합니다." };
	}

	if (!imageBase64) {
		return { success: false, error: "이미지가 비어 있습니다." };
	}

	const categories = DEFAULT_CATEGORIES;

	return parseTransactionImage(imageBase64, mimeType, textInput, categories);
}
