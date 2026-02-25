import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ENC_PREFIX = "enc:v1:";
let cachedKey: Buffer | null | undefined;

function getKey(): Buffer | null {
	if (cachedKey !== undefined) return cachedKey;

	const encoded = process.env.APP_FIELD_ENCRYPTION_KEY;
	if (!encoded) {
		cachedKey = null;
		return cachedKey;
	}

	const key = Buffer.from(encoded, "base64");
	if (key.length !== 32) {
		throw new Error("APP_FIELD_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
	}

	cachedKey = key;
	return cachedKey;
}

function safeDecrypt(ciphertext: string): string | null {
	if (!ciphertext.startsWith(ENC_PREFIX)) return null;

	const payload = ciphertext.slice(ENC_PREFIX.length);
	const [ivB64, tagB64, dataB64] = payload.split(".");
	if (!ivB64 || !tagB64 || !dataB64) return null;

	const key = getKey();
	if (!key) return null;

	try {
		const iv = Buffer.from(ivB64, "base64");
		const tag = Buffer.from(tagB64, "base64");
		const data = Buffer.from(dataB64, "base64");

		const decipher = createDecipheriv("aes-256-gcm", key, iv);
		decipher.setAuthTag(tag);
		const plain = Buffer.concat([decipher.update(data), decipher.final()]);
		return plain.toString("utf8");
	} catch {
		return null;
	}
}

export function isFieldEncryptionEnabled(): boolean {
	return !!getKey();
}

export function encryptString(value: string | null | undefined): string | null {
	if (value == null) return null;
	const key = getKey();
	if (!key) return null;

	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();

	return `${ENC_PREFIX}${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptString(
	encrypted: string | null | undefined,
	fallback?: string | null,
): string {
	if (!encrypted) return fallback ?? "";
	const plain = safeDecrypt(encrypted);
	if (plain != null) return plain;
	return fallback ?? "";
}

export function encryptNumber(value: number | null | undefined): string | null {
	if (value == null) return null;
	return encryptString(String(value));
}

export function decryptNumber(
	encrypted: string | null | undefined,
	fallback = 0,
): number {
	if (!encrypted) return fallback;
	const plain = safeDecrypt(encrypted);
	if (plain == null) return fallback;
	const n = Number(plain);
	return Number.isFinite(n) ? n : fallback;
}
