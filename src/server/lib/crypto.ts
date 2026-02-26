import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_VERSION = "v1";
const ENCRYPTED_PREFIX = `${KEY_VERSION}:`;

function getKey(): Buffer {
	const hex = process.env.ENCRYPTION_KEY;
	if (!hex) {
		throw new Error("ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.");
	}
	const buf = Buffer.from(hex, "hex");
	if (buf.length !== 32) {
		throw new Error(`ENCRYPTION_KEY는 32바이트(64자 hex)여야 합니다. 현재: ${buf.length}바이트`);
	}
	return buf;
}

export function encrypt(plaintext: string): string {
	const key = getKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);

	const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const authTag = cipher.getAuthTag();

	// iv(12) + authTag(16) + ciphertext → base64
	const payload = Buffer.concat([iv, authTag, encrypted]);
	return `${ENCRYPTED_PREFIX}${payload.toString("base64")}`;
}

export function decrypt(ciphertext: string): string {
	if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
		throw new Error("암호화된 데이터가 아닙니다: 올바른 프리픽스가 없습니다.");
	}

	const key = getKey();
	const payload = Buffer.from(ciphertext.slice(ENCRYPTED_PREFIX.length), "base64");

	if (payload.length < IV_LENGTH + AUTH_TAG_LENGTH) {
		throw new Error("암호화된 데이터가 손상되었습니다: 페이로드가 너무 짧습니다.");
	}

	const iv = payload.subarray(0, IV_LENGTH);
	const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
	const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
	return decrypted.toString("utf8");
}

export function encryptNullable(value: string | null | undefined): string | null {
	if (value === null || value === undefined) return null;
	return encrypt(value);
}

export function decryptNullable(value: string | null | undefined): string | null {
	if (value === null || value === undefined) return null;
	if (!isEncrypted(value)) return value;
	return decrypt(value);
}

export function isEncrypted(value: string): boolean {
	return value.startsWith(ENCRYPTED_PREFIX);
}
