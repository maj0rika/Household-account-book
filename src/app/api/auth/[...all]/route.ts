import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";

import { auth } from "@/server/auth";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(req: Request) {
	try {
		return await handler.POST(req);
	} catch (e) {
		console.error("[Auth POST Error]", e);
		return NextResponse.json(
			{ error: e instanceof Error ? e.message : "Unknown auth error" },
			{ status: 500 },
		);
	}
}
