import { NextResponse } from "next/server";
import { getRequestSession } from "@/server/auth";
import { executeTextParse, executeImageParse } from "@/server/services/parse-core";

export async function POST(request: Request) {
	const session = await getRequestSession(request.headers);

	if (!session?.user) {
		return NextResponse.json({ success: false, error: "인증이 필요합니다." }, { status: 401 });
	}

	const contentType = request.headers.get("content-type") ?? "";

	// multipart/form-data → 이미지 파싱
	if (contentType.includes("multipart/form-data")) {
		const formData = await request.formData().catch(() => null);
		if (!formData) {
			return NextResponse.json(
				{ success: false, error: "form-data 파싱에 실패했습니다." },
				{ status: 400 },
			);
		}

		const file = formData.get("image") as File | null;
		if (!file) {
			return NextResponse.json(
				{ success: false, error: "image 필드가 필요합니다." },
				{ status: 400 },
			);
		}

		const arrayBuffer = await file.arrayBuffer();
		const imageBase64 = Buffer.from(arrayBuffer).toString("base64");
		const mimeType = file.type || "image/jpeg";
		const textInput = (formData.get("input") as string) ?? "";

		const result = await executeImageParse(
			imageBase64,
			mimeType,
			textInput,
			session.user.id,
			session.session.id,
		);

		const status = result.success ? 200 : 422;
		return NextResponse.json(result, { status });
	}

	// application/json → 텍스트 파싱
	const body = await request.json().catch(() => null);
	if (!body || typeof body.input !== "string") {
		return NextResponse.json(
			{ success: false, error: "input 필드가 필요합니다." },
			{ status: 400 },
		);
	}

	if (typeof body.imageBase64 === "string" && body.imageBase64) {
		if (typeof body.mimeType !== "string" || !body.mimeType) {
			return NextResponse.json(
				{ success: false, error: "mimeType 필드가 필요합니다." },
				{ status: 400 },
			);
		}

		const result = await executeImageParse(
			body.imageBase64,
			body.mimeType,
			body.input,
			session.user.id,
			session.session.id,
		);
		const status = result.success ? 200 : 422;

		return NextResponse.json(result, { status });
	}

	const result = await executeTextParse(body.input, session.user.id, session.session.id);
	const status = result.success ? 200 : 422;

	return NextResponse.json(result, { status });
}
