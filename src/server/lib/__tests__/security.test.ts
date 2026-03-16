import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
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
		});
		const invalid = validateImagePayload({
			mimeType: "image/svg+xml",
			byteLength: 1024,
			base64Length: 2048,
		});

		expect(valid.ok).toBe(true);
		expect(invalid.ok).toBe(false);
	});
});
