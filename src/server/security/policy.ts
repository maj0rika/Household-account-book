// 파일 역할:
// - parse API와 인증 계층이 공통으로 쓰는 요청 검증/정규화/비식별화 정책 파일이다.
// 사용 위치:
// - `src/server/lib/__tests__/security.test.ts`에서 이 파일을 import해 상위 흐름에 연결한다;
// - `src/server/security/index.ts`에서 이 파일을 import해 상위 흐름에 연결한다;
// 흐름:
// - Route Handler/인증 로직이 원본 헤더나 입력을 넘기면 -> 이 파일이 길이/형식/IP/origin을 정규화하고 검증 -> 상위 계층이 차단 여부와 로그 정책을 결정한다;
import { createHmac } from "crypto";
import { isIP } from "node:net";

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

// 신뢰할 수 있는 origin 목록은 환경변수 둘 중 실제로 파싱 가능한 값만 남긴다.
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

// 빈 문자열과 공백만 있는 헤더는 모두 null로 접어 이후 분기 조건을 단순화한다.
function normalizeHeaderValue(value: string | null): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

// IPv6는 개별 주소 단위로 저장하면 개인정보 노출과 과한 분산이 생길 수 있어 /64 단위로 축약한다.
function normalizeIpv6Subnet(value: string): string | null {
	const [withoutZone] = value.split("%");
	const embeddedIpv4Index = withoutZone.lastIndexOf(":");
	const embeddedIpv4 = withoutZone.slice(embeddedIpv4Index + 1);
	const normalizedIpv6 = isIP(embeddedIpv4) === 4
		? (() => {
				const octets = embeddedIpv4.split(".").map((part) => Number(part));
				const first = ((octets[0] << 8) | octets[1]).toString(16);
				const second = ((octets[2] << 8) | octets[3]).toString(16);
				return `${withoutZone.slice(0, embeddedIpv4Index)}:${first}:${second}`;
			})()
		: withoutZone;
	const [left = "", right = ""] = normalizedIpv6.split("::");
	const leftParts = left ? left.split(":").filter(Boolean) : [];
	const rightParts = right ? right.split(":").filter(Boolean) : [];
	const missingParts = 8 - (leftParts.length + rightParts.length);
	if (missingParts < 0) return null;

	const expanded = [
		...leftParts,
		...Array.from({ length: missingParts }, () => "0"),
		...rightParts,
	].map((part) => part.toLowerCase().padStart(4, "0"));

	if (expanded.length !== 8) return null;

	return `${expanded.slice(0, 4).join(":")}::/64`;
}

// rate limit 키는 "같은 사용자/같은 네트워크"가 안정적으로 같은 버킷에 들어가도록 정규화한다.
function normalizeIpForRateLimit(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return trimmed;

	if (trimmed.startsWith("[") && trimmed.includes("]")) {
		const closingIndex = trimmed.indexOf("]");
		const bracketed = trimmed.slice(1, closingIndex);
		const normalizedBracketed = normalizeIpv6Subnet(bracketed);
		return normalizedBracketed ?? bracketed;
	}

	const ipv4WithPort = trimmed.match(/^(\d+\.\d+\.\d+\.\d+):\d+$/);
	if (ipv4WithPort) {
		return ipv4WithPort[1];
	}

	const version = isIP(trimmed.split("%")[0]);
	if (version === 6) {
		return normalizeIpv6Subnet(trimmed) ?? trimmed.toLowerCase();
	}

	return trimmed;
}

function looksLikeBase64Payload(input: string): boolean {
	const compact = input.replace(/\s+/g, "");
	if (compact.length < 256) return false;
	if (compact.length % 4 !== 0) return false;
	return BASE64_ONLY_REGEX.test(compact);
}

// `looksLikeBase64Payload()`보다 강한 검증이다.
// 실제 디코드/재인코드가 가능한 경우만 true를 줘 이미지 위장 텍스트를 더 강하게 잡아낸다.
function isStrictBase64Payload(input: string): boolean {
	const compact = input.replace(/\s+/g, "");
	if (!compact) return false;
	if (compact.length % 4 !== 0) return false;
	if (!BASE64_ONLY_REGEX.test(compact)) return false;

	try {
		return Buffer.from(compact, "base64").toString("base64") === compact;
	} catch {
		return false;
	}
}

export function hashSecurityValue(value: string, namespace = "general"): string {
	// 원본 IP/세션/유저 ID는 그대로 저장하지 않고
	// namespace를 섞은 HMAC 해시로만 보관해 추적성과 비식별화를 동시에 챙긴다.
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
		if (first) return normalizeIpForRateLimit(first);
	}

	for (const header of FALLBACK_IP_HEADERS) {
		const value = normalizeHeaderValue(headers.get(header));
		if (value) return normalizeIpForRateLimit(value);
	}

	return null;
}

export function assertTrustedOrigin(request: Request): boolean {
	// `parse` API의 첫 번째 방어선이다.
	// origin이 비어 있더라도 referer로 한 번 더 판정해 모바일 웹뷰/브라우저 차이를 흡수한다.
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

	// 상위 rate limit 계층은 이 fingerprint를 그대로 받아
	// IP 단위, 세션 단위, 사용자 단위 정책을 상황에 맞게 조합한다.
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

	// parse route에서 가장 먼저 호출되는 텍스트 정책이다.
	// 여기서 걸러진 입력은 LLM/OOD 필터로 내려가지 않고 바로 보안 이벤트 대상이 된다.
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
		// base64로 가득 찬 텍스트는 이미지 payload 우회나 비정상 요청일 가능성이 높아 차단한다.
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
	base64Payload: string;
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

	// 이 함수는 이미지 파서로 내려가기 전의 최종 관문이다.
	// mime/type, 파일 크기, base64 형식이 모두 맞아야만 LLM provider 호출로 넘어간다.
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

	if (!isStrictBase64Payload(input.base64Payload)) {
		return {
			ok: false,
			code: "invalid_base64_image",
			message: "이미지 인코딩 형식이 올바르지 않습니다.",
			meta,
		};
	}

	return {
		ok: true,
		meta,
	};
}
