// 파일 역할:
// - 자연어/이미지 입력을 가계부 파싱 파이프라인으로 연결하는 API Route Handler 파일이다.
// 사용 위치:
// - `src/components/transaction/NaturalInputBar.tsx`, `src/components/assets/AccountFormSheet.tsx` 같은 입력 UI가 `/api/parse`로 요청을 보낼 때 직접 진입한다;
// 흐름:
// - 요청 진입 -> origin/인증/속도 제한 검사 -> 텍스트 또는 이미지 입력 검증 -> `executeTextParse()` 또는 `executeImageParse()` 호출 -> JSON 응답 반환 순서로 흐른다;
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
	// 실패 응답 포맷을 한 곳에서 맞춰 두면
	// 각 분기에서 상태 코드와 rate-limit 헤더만 넘겨도 된다.
	return NextResponse.json({ success: false, error }, { status, headers });
}

async function consumeUserParseLimit(
	userId: string,
	contentType: string,
): Promise<NextResponse | null> {
	// 사용자 단위 제한은 "누가" 과도하게 파서를 쓰는지를 막는 2차 방어선이다.
	// IP 제한과 별도로 둬서 로그인 사용자도 짧은 시간에 남용하지 못하게 만든다.
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
	// 하나의 route에서 json 자연어 입력과 multipart 이미지 입력을 모두 받는다.
	// 공통 보안 검증을 먼저 통과시킨 뒤 payload 형태에 따라 텍스트/이미지 파서로 분기한다.
	// 세션이 없더라도 origin mismatch 같은 이상 징후는 추적해야 하므로
	// 인증 전 fingerprint를 먼저 만들어 둔다.
	const unauthFingerprint = buildRequestFingerprint(request, null);

	if (!assertTrustedOrigin(request)) {
		// 신뢰되지 않은 origin은 즉시 거절하되, 반복 시도는 anomaly limit로 따로 관리한다.
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
		// parse API는 개인 데이터와 LLM 사용량을 소모하므로 익명 접근을 허용하지 않는다.
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

	// `multipart/form-data`는 브라우저 파일 업로드 경로다.
	// 이미지와 보조 텍스트를 같이 읽어 이미지 파서로 넘긴다.
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
		// 이미지 정책 검증은 LLM 호출보다 앞서 끝내야 비용과 공격 표면을 줄일 수 있다.
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

		// 이미지 파서는 세션 ID를 함께 받아 provider usage/cooldown 정책을 적용한다.
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

	// `application/json`은 자연어 입력 바의 기본 요청 형식이다.
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
		// JSON 안에 imageBase64를 실어 보내는 호환 경로도 남겨 두었다.
		// 과거 클라이언트도 동일한 보안 검증을 타도록 여기서 다시 체크한다.
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

		// JSON 이미지 경로도 결국 이미지 파서로 합류하므로
		// form-data 경로와 같은 세션 제한을 적용한다.
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
		// 잘못된 텍스트 입력은 OOD/LLM 단계로 내리지 않고 즉시 보안 이벤트와 함께 종료한다.
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

	// 텍스트 파서는 sanitize를 통과한 값만 받아
	// 이후 provider 폴백 로직이 항상 정규화된 입력을 기준으로 움직이게 만든다.
	const result = await executeTextParse(
		sanitizedInput.value,
		session.user.id,
		session.session.id,
	);
	const status = result.success ? 200 : 422;

	return NextResponse.json(result, { status });
}
