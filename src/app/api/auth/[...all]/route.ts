import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";

import { auth } from "@/server/auth";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(req: Request) {
	try {
		const cloned = req.clone();
		const body = await cloned.json().catch(() => null);
		console.log("[Auth POST] path:", new URL(req.url).pathname, "body:", JSON.stringify(body));

		const response = await handler.POST(req);

		console.log("[Auth POST] status:", response.status);
		if (response.status >= 400) {
			const text = await response.clone().text();
			console.error("[Auth POST] error response:", text);
			if (!text) {
				return NextResponse.json(
					{ error: "Auth returned empty error", status: response.status },
					{ status: response.status },
				);
			}
		}

		return response;
	} catch (e) {
		console.error("[Auth POST Error]", e);
		return NextResponse.json(
			{ error: e instanceof Error ? e.message : "Unknown auth error", stack: e instanceof Error ? e.stack : undefined },
			{ status: 500 },
		);
	}
}
