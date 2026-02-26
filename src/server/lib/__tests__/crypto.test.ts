import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { encrypt, decrypt, encryptNullable, decryptNullable, isEncrypted } from "../crypto";

const TEST_KEY = "a".repeat(64); // 32바이트 hex

describe("crypto", () => {
	beforeEach(() => {
		vi.stubEnv("ENCRYPTION_KEY", TEST_KEY);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("라운드트립: encrypt → decrypt가 원본을 복원한다", () => {
		const original = "오늘 점심 김치찌개 12000원";
		const encrypted = encrypt(original);
		const decrypted = decrypt(encrypted);
		expect(decrypted).toBe(original);
	});

	it("빈 문자열도 정상 라운드트립된다", () => {
		const encrypted = encrypt("");
		expect(decrypt(encrypted)).toBe("");
	});

	it("동일 입력도 매번 다른 암호문을 생성한다 (IV 고유성)", () => {
		const input = "같은 텍스트";
		const a = encrypt(input);
		const b = encrypt(input);
		expect(a).not.toBe(b);
		expect(decrypt(a)).toBe(input);
		expect(decrypt(b)).toBe(input);
	});

	it("암호문이 v1: 프리픽스로 시작한다", () => {
		const encrypted = encrypt("test");
		expect(encrypted.startsWith("v1:")).toBe(true);
	});

	it("isEncrypted가 암호문을 올바르게 식별한다", () => {
		expect(isEncrypted("v1:abc123")).toBe(true);
		expect(isEncrypted("평문 텍스트")).toBe(false);
		expect(isEncrypted("")).toBe(false);
	});

	it("변조된 암호문은 decrypt 시 에러를 던진다", () => {
		const encrypted = encrypt("비밀 데이터");
		// base64 페이로드 일부를 변조
		const tampered = encrypted.slice(0, -4) + "XXXX";
		expect(() => decrypt(tampered)).toThrow();
	});

	it("encryptNullable: null → null", () => {
		expect(encryptNullable(null)).toBeNull();
	});

	it("encryptNullable: undefined → null", () => {
		expect(encryptNullable(undefined)).toBeNull();
	});

	it("encryptNullable: 문자열 → 암호화", () => {
		const result = encryptNullable("메모");
		expect(result).not.toBeNull();
		expect(isEncrypted(result!)).toBe(true);
	});

	it("decryptNullable: null → null", () => {
		expect(decryptNullable(null)).toBeNull();
	});

	it("decryptNullable: 암호화되지 않은 평문 → 그대로 반환", () => {
		expect(decryptNullable("평문 메모")).toBe("평문 메모");
	});

	it("decryptNullable: 암호문 → 복호화", () => {
		const encrypted = encrypt("비밀");
		expect(decryptNullable(encrypted)).toBe("비밀");
	});

	it("ENCRYPTION_KEY 미설정 시 에러", () => {
		vi.stubEnv("ENCRYPTION_KEY", "");
		expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.");
	});

	it("잘못된 길이의 ENCRYPTION_KEY는 에러", () => {
		vi.stubEnv("ENCRYPTION_KEY", "abcd");
		expect(() => encrypt("test")).toThrow("32바이트(64자 hex)여야 합니다");
	});
});
