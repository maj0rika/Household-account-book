import { createHmac } from "crypto";

export type SecurityEventType =
	| "blocked"
	| "throttled"
	| "invalid_input"
	| "origin_mismatch"
	| "suspicious_pattern"
	| "unauthorized";

export interface RequestFingerprint {
	ipAddress: string | null;
	ipHash: string | null;
	sessionHash: string | null;
	userHash: string | null;
}

export interface ParseInputPolicy {
	maxTextLength: number;
	maxTextLines: number;
	maxImageBytes: number;
	maxImageBase64Length: number;
	allowedImageMimeTypes: string[];
}

type SecurityEventMetadataValue = string | number | boolean | null;

export const PARSE_INPUT_POLICY: ParseInputPolicy = {
	maxTextLength: 3000,
	maxTextLines: 40,
	maxImageBytes: 8 * 1024 * 1024,
	maxImageBase64Length: 3_000_000,
	allowedImageMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
};

const SECURITY_DIGEST_VERSION = "v1";
const X_FORWARDED_FOR_HEADER = "x-forwarded-for";
const FALLBACK_IP_HEADERS = ["x-real-ip", "cf-connecting-ip"];
const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const BASE64_ONLY_REGEX = /^[A-Za-z0-9+/=\s]+$/;

function getSecuritySecret(): string {
	const secret = process.env.BETTER_AUTH_SECRET ?? process.env.ENCRYPTION_KEY;
	if (!secret) {
		throw new Error("보안 해시용 BETTER_AUTH_SECRET 또는 ENCRYPTION_KEY가 필요합니다.");
	}
	return secret;
}

function getOriginCandidates(): string[] {
	return [
		process.env.BETTER_AUTH_URL,
		process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
	]
		.filter((value): value is string => Boolean(value))
		.map((value) => {
			try {
				return new URL(value).origin;
			} catch {
				return null;
			}
		})
		.filter((value): value is string => Boolean(value));
}

function normalizeHeaderValue(value: string | null): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function looksLikeBase64Payload(input: string): boolean {
	const compact = input.replace(/\s+/g, "");
	if (compact.length < 256) return false;
	if (compact.length % 4 !== 0) return false;
	return BASE64_ONLY_REGEX.test(compact);
}

export function hashSecurityValue(value: string, namespace = "general"): string {
	const digest = createHmac("sha256", getSecuritySecret())
		.update(`${SECURITY_DIGEST_VERSION}:${namespace}:`)
		.update(value)
		.digest("hex");
	return `${namespace}:${SECURITY_DIGEST_VERSION}:${digest}`;
}

export function minimizeSessionIpAddress(value: string | null | undefined): string | null {
	const normalized = normalizeHeaderValue(value ?? null);
	if (!normalized) return null;
	if (normalized.startsWith("ip:")) return normalized;
	return hashSecurityValue(normalized, "ip");
}

export function minimizeSessionUserAgent(value: string | null | undefined): string | null {
	const normalized = normalizeHeaderValue(value ?? null);
	if (!normalized) return null;
	if (normalized.startsWith("ua:")) return normalized;
	return hashSecurityValue(normalized, "ua");
}

export function extractRequestIp(input: Headers | Request): string | null {
	const headers = input instanceof Request ? input.headers : input;
	const forwarded = normalizeHeaderValue(headers.get(X_FORWARDED_FOR_HEADER));
	if (forwarded) {
		const first = forwarded.split(",")[0]?.trim() ?? "";
		if (first) return first;
	}

	for (const header of FALLBACK_IP_HEADERS) {
		const value = normalizeHeaderValue(headers.get(header));
		if (value) return value;
	}

	return null;
}

export function assertTrustedOrigin(request: Request): boolean {
	const trustedOrigins = getOriginCandidates();
	if (trustedOrigins.length === 0) return true;

	const originHeader = normalizeHeaderValue(request.headers.get("origin"));
	if (originHeader) {
		return trustedOrigins.includes(originHeader);
	}

	const referer = normalizeHeaderValue(request.headers.get("referer"));
	if (!referer) {
		return false;
	}

	try {
		return trustedOrigins.includes(new URL(referer).origin);
	} catch {
		return false;
	}
}

export function buildRequestFingerprint(
	request: Request,
	session?: { user?: { id?: string | null }; session?: { id?: string | null } } | null,
): RequestFingerprint {
	const ipAddress = extractRequestIp(request);

	return {
		ipAddress,
		ipHash: ipAddress ? hashSecurityValue(ipAddress, "ip") : null,
		sessionHash: session?.session?.id ? hashSecurityValue(session.session.id, "session") : null,
		userHash: session?.user?.id ? hashSecurityValue(session.user.id, "user") : null,
	};
}

export function sanitizeTextInput(input: string): {
	ok: true;
	value: string;
	length: number;
	lineCount: number;
} | {
	ok: false;
	code: string;
	message: string;
	meta: Record<string, SecurityEventMetadataValue>;
} {
	const normalized = input
		.replace(/\r\n/g, "\n")
		.replace(CONTROL_CHARS_REGEX, "")
		.trim();
	const lineCount = normalized ? normalized.split("\n").length : 0;
	const length = normalized.length;

	if (!normalized) {
		return {
			ok: false,
			code: "empty_input",
			message: "입력이 비어 있습니다.",
			meta: { length, lineCount },
		};
	}

	if (length > PARSE_INPUT_POLICY.maxTextLength) {
		return {
			ok: false,
			code: "text_too_long",
			message: `입력은 ${PARSE_INPUT_POLICY.maxTextLength.toLocaleString()}자 이하여야 합니다.`,
			meta: { length, lineCount },
		};
	}

	if (lineCount > PARSE_INPUT_POLICY.maxTextLines) {
		return {
			ok: false,
			code: "too_many_lines",
			message: `입력은 ${PARSE_INPUT_POLICY.maxTextLines}줄 이하여야 합니다.`,
			meta: { length, lineCount },
		};
	}

	if (looksLikeBase64Payload(normalized)) {
		return {
			ok: false,
			code: "base64_only_text",
			message: "텍스트 입력 형식이 올바르지 않습니다. 일반 문장으로 다시 입력해 주세요.",
			meta: { length, lineCount },
		};
	}

	return {
		ok: true,
		value: normalized,
		length,
		lineCount,
	};
}

export function validateImagePayload(input: {
	mimeType: string;
	byteLength: number;
	base64Length: number;
}): {
	ok: true;
	meta: Record<string, SecurityEventMetadataValue>;
} | {
	ok: false;
	code: string;
	message: string;
	meta: Record<string, SecurityEventMetadataValue>;
} {
	const normalizedMimeType = input.mimeType.toLowerCase().trim();
	const meta = {
		mimeType: normalizedMimeType,
		byteLength: input.byteLength,
		base64Length: input.base64Length,
	};

	if (!PARSE_INPUT_POLICY.allowedImageMimeTypes.includes(normalizedMimeType)) {
		return {
			ok: false,
			code: "invalid_image_mime",
			message: "JPG, PNG, WEBP, GIF 이미지만 업로드할 수 있습니다.",
			meta,
		};
	}

	if (input.byteLength > PARSE_INPUT_POLICY.maxImageBytes) {
		return {
			ok: false,
			code: "image_too_large",
			message: "이미지 크기는 8MB 이하여야 합니다.",
			meta,
		};
	}

	if (input.base64Length > PARSE_INPUT_POLICY.maxImageBase64Length) {
		return {
			ok: false,
			code: "image_payload_too_large",
			message: "이미지 인코딩 데이터가 너무 큽니다. 더 작은 이미지를 사용해 주세요.",
			meta,
		};
	}

	return {
		ok: true,
		meta,
	};
}
