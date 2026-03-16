import { NextResponse } from "next/server";

import { getRequestSession } from "@/server/auth";
import { executeTextParse, executeImageParse } from "@/server/services/parse-core";
import {
	assertTrustedOrigin,
	buildRateLimitHeaders,
	buildRequestFingerprint,
	consumeIpAnomalyLimit,
	consumeRateLimit,
	recordSecurityEvent,
	sanitizeTextInput,
	validateImagePayload,
} from "@/server/security";

function jsonError(
	error: string,
	status: number,
	headers?: HeadersInit,
) {
	return NextResponse.json({ success: false, error }, { status, headers });
}

async function consumeUserParseLimit(
	userId: string,
	contentType: string,
): Promise<NextResponse | null> {
	const userDecision = await consumeRateLimit({
		scope: "parse:user",
		subject: userId,
		max: 20,
		windowSeconds: 5 * 60,
		reason: "parse_user_limit",
	});

	if (userDecision.allowed) {
		return null;
	}

	await recordSecurityEvent({
		type: "throttled",
		scope: userDecision.scope,
		keyHash: userDecision.keyHash,
		reason: userDecision.reason,
		metadata: {
			retryAfterSeconds: userDecision.retryAfterSeconds,
			contentType: contentType || "unknown",
		},
	});

	return jsonError(
		"요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
		429,
		buildRateLimitHeaders(userDecision),
	);
}

export async function POST(request: Request) {
	const unauthFingerprint = buildRequestFingerprint(request, null);

	if (!assertTrustedOrigin(request)) {
		const decision = await consumeIpAnomalyLimit({
			fingerprint: unauthFingerprint,
			scope: "parse:public:ip",
			reason: "origin_mismatch",
			metadata: {
				contentType: request.headers.get("content-type") ?? "unknown",
			},
		});

		if (decision && !decision.allowed) {
			return jsonError(
				"요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
				429,
				buildRateLimitHeaders(decision),
			);
		}

		return jsonError("허용되지 않은 요청 출처입니다.", 403);
	}

	const session = await getRequestSession(request.headers);
	const fingerprint = buildRequestFingerprint(request, session);

	if (!session?.user) {
		const decision = await consumeIpAnomalyLimit({
			fingerprint,
			scope: "parse:public:ip",
			reason: "unauthorized_access",
		});

		if (decision && !decision.allowed) {
			return jsonError(
				"요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
				429,
				buildRateLimitHeaders(decision),
			);
		}

		return jsonError("인증이 필요합니다.", 401);
	}

	const contentType = request.headers.get("content-type") ?? "";

	// multipart/form-data → 이미지 파싱
	if (contentType.includes("multipart/form-data")) {
		const formData = await request.formData().catch(() => null);
		if (!formData) {
			const decision = await consumeIpAnomalyLimit({
				fingerprint,
				scope: "parse:public:ip",
				reason: "invalid_form_data",
			});
			if (decision && !decision.allowed) {
				return jsonError(
					"요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
					429,
					buildRateLimitHeaders(decision),
				);
			}

			return jsonError("form-data 파싱에 실패했습니다.", 400);
		}

		const file = formData.get("image") as File | null;
		if (!file) {
			const decision = await consumeIpAnomalyLimit({
				fingerprint,
				scope: "parse:public:ip",
				reason: "missing_image_field",
			});
			if (decision && !decision.allowed) {
				return jsonError(
					"요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
					429,
					buildRateLimitHeaders(decision),
				);
			}

			return jsonError("image 필드가 필요합니다.", 400);
		}

		const arrayBuffer = await file.arrayBuffer();
		const imageBase64 = Buffer.from(arrayBuffer).toString("base64");
		const mimeType = file.type || "image/jpeg";
		const validation = validateImagePayload({
			mimeType,
			byteLength: file.size,
			base64Length: imageBase64.length,
			base64Payload: imageBase64,
		});

		if (!validation.ok) {
			const decision = await consumeIpAnomalyLimit({
				fingerprint,
				scope: "parse:public:ip",
				reason: validation.code,
				metadata: validation.meta,
			});
			if (decision && !decision.allowed) {
				return jsonError(
					"요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
					429,
					buildRateLimitHeaders(decision),
				);
			}

			return jsonError(validation.message, 400);
		}

		const userLimitResponse = await consumeUserParseLimit(session.user.id, contentType);
		if (userLimitResponse) {
			return userLimitResponse;
		}

		const imageDecision = await consumeRateLimit({
			scope: "parse:image:session",
			subject: session.session.id,
			max: 6,
			windowSeconds: 10 * 60,
			reason: "parse_image_session_limit",
		});

		if (!imageDecision.allowed) {
			await recordSecurityEvent({
				type: "throttled",
				scope: imageDecision.scope,
				keyHash: imageDecision.keyHash,
				reason: imageDecision.reason,
				metadata: {
					retryAfterSeconds: imageDecision.retryAfterSeconds,
					contentType,
				},
			});

			return jsonError(
				"이미지 분석 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
				429,
				buildRateLimitHeaders(imageDecision),
			);
		}

		const rawTextInput = (formData.get("input") as string) ?? "";
		const sanitizedText = sanitizeTextInput(rawTextInput);
		const textInput = sanitizedText.ok ? sanitizedText.value : "";

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
		const decision = await consumeIpAnomalyLimit({
			fingerprint,
			scope: "parse:public:ip",
			reason: "missing_input_field",
		});
		if (decision && !decision.allowed) {
			return jsonError(
				"요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
				429,
				buildRateLimitHeaders(decision),
			);
		}

		return jsonError("input 필드가 필요합니다.", 400);
	}

	const sanitizedInput = sanitizeTextInput(body.input);

	if (typeof body.imageBase64 === "string" && body.imageBase64) {
		if (typeof body.mimeType !== "string" || !body.mimeType) {
			const decision = await consumeIpAnomalyLimit({
				fingerprint,
				scope: "parse:public:ip",
				reason: "missing_mime_type",
			});
			if (decision && !decision.allowed) {
				return jsonError(
					"요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
					429,
					buildRateLimitHeaders(decision),
				);
			}

			return jsonError("mimeType 필드가 필요합니다.", 400);
		}

		const byteLength = Buffer.byteLength(body.imageBase64, "base64");
		const validation = validateImagePayload({
			mimeType: body.mimeType,
			byteLength,
			base64Length: body.imageBase64.length,
			base64Payload: body.imageBase64,
		});

		if (!validation.ok) {
			const decision = await consumeIpAnomalyLimit({
				fingerprint,
				scope: "parse:public:ip",
				reason: validation.code,
				metadata: validation.meta,
			});
			if (decision && !decision.allowed) {
				return jsonError(
					"요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
					429,
					buildRateLimitHeaders(decision),
				);
			}

			return jsonError(validation.message, 400);
		}

		const userLimitResponse = await consumeUserParseLimit(session.user.id, contentType);
		if (userLimitResponse) {
			return userLimitResponse;
		}

		const imageDecision = await consumeRateLimit({
			scope: "parse:image:session",
			subject: session.session.id,
			max: 6,
			windowSeconds: 10 * 60,
			reason: "parse_image_session_limit",
		});

		if (!imageDecision.allowed) {
			await recordSecurityEvent({
				type: "throttled",
				scope: imageDecision.scope,
				keyHash: imageDecision.keyHash,
				reason: imageDecision.reason,
				metadata: {
					retryAfterSeconds: imageDecision.retryAfterSeconds,
					contentType,
				},
			});

			return jsonError(
				"이미지 분석 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
				429,
				buildRateLimitHeaders(imageDecision),
			);
		}

		const textInput = sanitizedInput.ok ? sanitizedInput.value : "";
		const result = await executeImageParse(
			body.imageBase64,
			body.mimeType,
			textInput,
			session.user.id,
			session.session.id,
		);
		const status = result.success ? 200 : 422;

		return NextResponse.json(result, { status });
	}

	if (!sanitizedInput.ok) {
		const decision = await consumeIpAnomalyLimit({
			fingerprint,
			scope: "parse:public:ip",
			reason: sanitizedInput.code,
			metadata: sanitizedInput.meta,
		});
		if (decision && !decision.allowed) {
			return jsonError(
				"요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
				429,
				buildRateLimitHeaders(decision),
			);
		}

		return jsonError(sanitizedInput.message, 400);
	}

	const userLimitResponse = await consumeUserParseLimit(session.user.id, contentType);
	if (userLimitResponse) {
		return userLimitResponse;
	}

	const result = await executeTextParse(
		sanitizedInput.value,
		session.user.id,
		session.session.id,
	);
	const status = result.success ? 200 : 422;

	return NextResponse.json(result, { status });
}
