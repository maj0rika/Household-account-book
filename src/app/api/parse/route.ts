import { NextResponse } from "next/server";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { auth } from "@/server/auth";
import { parseTransactionText } from "@/server/llm";

export async function POST(request: Request) {
	const session = await auth.api.getSession({
		headers: request.headers,
	});

	if (!session?.user) {
		return NextResponse.json({ success: false, error: "인증이 필요합니다." }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	if (!body?.input || typeof body.input !== "string") {
		return NextResponse.json(
			{ success: false, error: "input 필드가 필요합니다." },
			{ status: 400 },
		);
	}

	// TODO: 유저별 커스텀 카테고리 조회 (v1.0은 기본 카테고리 사용)
	const categories = DEFAULT_CATEGORIES;

	const result = await parseTransactionText(body.input, categories);
	const status = result.success ? 200 : 500;

	return NextResponse.json(result, { status });
}
