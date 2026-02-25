"use server";

import { headers } from "next/headers";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { auth } from "@/server/auth";
import { parseTransactionText } from "@/server/llm";
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

	// TODO: 유저별 커스텀 카테고리 조회 (v1.0은 기본 카테고리 사용)
	const categories = DEFAULT_CATEGORIES;

	// 은행/카드 알림 메시지 감지 시 전처리
	const processedInput = isBankMessage(input)
		? preprocessBankMessage(input)
		: input;

	return parseTransactionText(processedInput, categories);
}
