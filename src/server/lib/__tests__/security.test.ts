// 파일 역할:
// - 서버 보안/암호화 유틸의 회귀 테스트 파일이다.
// 사용 위치:
// - 직접 import 경로가 드러나지 않는 진입점이거나, 프레임워크/테스트 러너가 런타임에 호출한다;
// 흐름:
// - 상위 호출자가 입력을 넘기고, 이 파일이 자신의 책임 범위만 처리한 뒤 결과를 반환하는 구조다;
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
	extractRequestIp,
	hashSecurityValue,
	minimizeSessionIpAddress,
	minimizeSessionUserAgent,
	sanitizeTextInput,
	validateImagePayload,
} from "@/server/security/policy";

describe("security helpers", () => {
	beforeEach(() => {
		vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-key");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("민감 식별자를 해시한다", () => {
		const hashed = hashSecurityValue("127.0.0.1", "ip");

		expect(hashed).toMatch(/^ip:v1:[a-f0-9]{64}$/);
		expect(hashed).not.toContain("127.0.0.1");
	});

	it("세션 IP와 User-Agent를 최소화한다", () => {
		expect(minimizeSessionIpAddress("127.0.0.1")).toMatch(/^ip:v1:/);
		expect(minimizeSessionUserAgent("Mozilla/5.0")).toMatch(/^ua:v1:/);
	});

	it("IPv6 요청 IP를 /64 기준으로 정규화한다", () => {
		const headers = new Headers({
			"x-forwarded-for": "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
		});

		expect(extractRequestIp(headers)).toBe("2001:0db8:85a3:0000::/64");
	});

	it("텍스트 입력에서 제어문자를 제거하고 길이를 검증한다", () => {
		const result = sanitizeTextInput("  안녕\u0000하세요\n");

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw new Error("expected sanitized text to be valid");
		}

		expect(result.value).toBe("안녕하세요");
	});

	it("base64만 들어온 비정상 텍스트를 차단한다", () => {
		const suspicious = "QUJDREVGR0g=".repeat(40);
		const result = sanitizeTextInput(suspicious);

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("expected suspicious payload to be rejected");
		}

		expect(result.code).toBe("base64_only_text");
	});

	it("이미지 payload 상한을 검증한다", () => {
		const valid = validateImagePayload({
			mimeType: "image/png",
			byteLength: 1024,
			base64Length: 2048,
			base64Payload: Buffer.from("hello-image").toString("base64"),
		});
		const invalid = validateImagePayload({
			mimeType: "image/svg+xml",
			byteLength: 1024,
			base64Length: 2048,
			base64Payload: Buffer.from("hello-image").toString("base64"),
		});

		expect(valid.ok).toBe(true);
		expect(invalid.ok).toBe(false);
	});

	it("잘못된 base64 이미지 payload를 차단한다", () => {
		const invalid = validateImagePayload({
			mimeType: "image/png",
			byteLength: 1024,
			base64Length: 16,
			base64Payload: "%%%not-base64%%%",
		});

		expect(invalid.ok).toBe(false);
		if (invalid.ok) {
			throw new Error("expected invalid base64 payload to be rejected");
		}

		expect(invalid.code).toBe("invalid_base64_image");
	});
});
