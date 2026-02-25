import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";

import { auth } from "@/server/auth";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(req: Request) {
	try {
		const response = await handler.POST(req);
		if (response.status >= 400) {
			const text = await response.clone().text();
			console.error("[Auth POST]", response.status, text);
			if (!text) {
				return NextResponse.json(
					{
						error: "Auth error with empty body",
						status: response.status,
						url: req.url,
						hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
						hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
						baseURL: process.env.BETTER_AUTH_URL,
					},
					{ status: response.status },
				);
			}
		}
		return response;
	} catch (e) {
		console.error("[Auth POST catch]", e);
		return NextResponse.json(
			{
				error: e instanceof Error ? e.message : String(e),
				stack: e instanceof Error ? e.stack?.split("\n").slice(0, 5) : undefined,
			},
			{ status: 500 },
		);
	}
}
