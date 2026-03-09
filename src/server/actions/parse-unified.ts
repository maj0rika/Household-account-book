"use server";

import { headers } from "next/headers";

import { auth } from "@/server/auth";
import { executeTextParse, executeImageParse } from "@/server/services/parse-core";
import type { UnifiedParseResponse } from "@/server/llm/types";

export async function parseUnifiedInput(input: string): Promise<UnifiedParseResponse> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		return { success: false, error: "인증이 필요합니다." };
	}

	return executeTextParse(input, session.user.id, session.session.id);
}

export async function parseUnifiedImageInput(
	imageBase64: string,
	mimeType: string,
	textInput: string,
): Promise<UnifiedParseResponse> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		return { success: false, error: "인증이 필요합니다." };
	}

	return executeImageParse(imageBase64, mimeType, textInput, session.user.id, session.session.id);
}
