"use server";

import { getServerSession } from "@/server/auth";
import { executeTextParse, executeImageParse } from "@/server/services/parse-core";
import type { UnifiedParseResponse } from "@/server/llm/types";

export async function parseUnifiedInput(input: string): Promise<UnifiedParseResponse> {
	const session = await getServerSession();

	if (!session?.user) {
		return { success: false, error: "인증이 필요합니다." };
	}

	// Server Action은 인증/세션 경계만 담당하고, 실제 파싱 정책은 parse-core로 위임한다.
	// 이렇게 얇게 유지해야 텍스트/이미지 모두 같은 인증 규칙을 공유하면서 내부 파싱 로직은 독립적으로 바꿀 수 있다.
	return executeTextParse(input, session.user.id, session.session.id);
}

export async function parseUnifiedImageInput(
	imageBase64: string,
	mimeType: string,
	textInput: string,
): Promise<UnifiedParseResponse> {
	const session = await getServerSession();

	if (!session?.user) {
		return { success: false, error: "인증이 필요합니다." };
	}

	// 이미지 파싱도 동일한 세션 검증 경계를 통과시켜
	// 클라이언트 입력 형태만 다르고 서버 쪽 실패 처리 규칙은 동일하게 유지한다.
	return executeImageParse(imageBase64, mimeType, textInput, session.user.id, session.session.id);
}
