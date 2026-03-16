import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";

import { auth } from "@/server/auth";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(req: Request) {
	try {
		return await handler.POST(req);
	} catch (e) {
		console.error("[Auth POST catch]", e);
		return NextResponse.json(
			{
				error: "인증 요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
			},
			{ status: 500 },
		);
	}
}
