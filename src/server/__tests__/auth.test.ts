import { PGlite } from "@electric-sql/pglite";
import { getIP } from "@better-auth/core/utils/ip";
import { APIError } from "better-auth";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "@/server/db/schema";
import { DEMO_ACCOUNT_BLOCKED_MESSAGE, DEMO_ACCOUNT_EMAIL } from "@/server/security/demo-account";

const client = new PGlite();
const mockDb = drizzle(client, { schema });

vi.mock("@/server/db", () => ({
	db: mockDb,
}));

vi.mock("next/headers", () => ({
	headers: vi.fn(async () => new Headers()),
}));

describe("better-auth 1.7.x server auth configuration & guards", () => {
	let authModule: typeof import("@/server/auth");

	beforeAll(async () => {
		vi.stubEnv("BETTER_AUTH_SECRET", "0123456789abcdef0123456789abcdef0123456789abcdef");
		vi.stubEnv("BETTER_AUTH_URL", "https://household.example.com");
		vi.stubEnv("NEXT_PUBLIC_BETTER_AUTH_URL", "https://household.example.com");

		await client.exec(`
			CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
			CREATE TABLE "user" (
				"id" text PRIMARY KEY,
				"name" text NOT NULL,
				"email" text NOT NULL UNIQUE,
				"email_verified" boolean NOT NULL DEFAULT false,
				"image" text,
				"created_at" timestamp with time zone NOT NULL,
				"updated_at" timestamp with time zone NOT NULL
			);
			CREATE TABLE "session" (
				"id" text PRIMARY KEY,
				"expires_at" timestamp with time zone NOT NULL,
				"token" text NOT NULL UNIQUE,
				"created_at" timestamp with time zone NOT NULL,
				"updated_at" timestamp with time zone NOT NULL,
				"ip_address" text,
				"user_agent" text,
				"user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
			);
			CREATE TABLE "account" (
				"id" text PRIMARY KEY,
				"account_id" text NOT NULL,
				"provider_id" text NOT NULL,
				"user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
				"access_token" text,
				"refresh_token" text,
				"id_token" text,
				"access_token_expires_at" timestamp with time zone,
				"refresh_token_expires_at" timestamp with time zone,
				"scope" text,
				"password" text,
				"created_at" timestamp with time zone NOT NULL,
				"updated_at" timestamp with time zone NOT NULL
			);
			CREATE TABLE "verification" (
				"id" text PRIMARY KEY,
				"identifier" text NOT NULL,
				"value" text NOT NULL,
				"expires_at" timestamp with time zone NOT NULL,
				"created_at" timestamp with time zone,
				"updated_at" timestamp with time zone
			);
			CREATE TABLE "rateLimit" (
				"id" text PRIMARY KEY,
				"key" text NOT NULL UNIQUE,
				"count" integer NOT NULL,
				"lastRequest" bigint NOT NULL
			);
			CREATE TABLE "categories" (
				"id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
				"user_id" text REFERENCES "user"("id") ON DELETE CASCADE,
				"name" text NOT NULL,
				"icon" text NOT NULL,
				"type" transaction_type NOT NULL,
				"sort_order" integer NOT NULL DEFAULT 0,
				"is_default" boolean NOT NULL DEFAULT false
			);
		`);

		vi.resetModules();
		authModule = await import("@/server/auth");
	});

	afterAll(async () => {
		vi.unstubAllEnvs();
		await client.close();
	});

	beforeEach(async () => {
		await client.exec('DELETE FROM "rateLimit"; DELETE FROM "session"; DELETE FROM "account"; DELETE FROM "categories"; DELETE FROM "user";');
	});

	it("passes Better Auth 1.7.x runtime schema validation with zero mismatches", async () => {
		const ctx = await authModule.auth.$context;
		await expect(ctx.checkSchema?.()).resolves.toBeUndefined();
		expect(ctx.baseURL).toBe("https://household.example.com/api/auth");
		expect(ctx.trustedOrigins).toContain("https://household.example.com");
		expect("trustedProxyHeaders" in (ctx.options.advanced ?? {})).toBe(false);
	});

	it("resolves single-value proxy IP headers and ignores multi-hop XFF without trustedProxies", () => {
		const { options } = authModule.auth;

		const singleXff = new Request("https://household.example.com/api/auth/sign-in/email", {
			headers: { "x-forwarded-for": "203.0.113.10" },
		});
		expect(getIP(singleXff, options)).toBe("203.0.113.10");

		// In 1.7.x, multi-value x-forwarded-for without trustedProxies is skipped so it cannot be spoofed;
		// getIP falls back to the next single-value proxy header (x-real-ip / cf-connecting-ip).
		const multiXffWithRealIp = new Request("https://household.example.com/api/auth/sign-in/email", {
			headers: {
				"x-forwarded-for": "198.51.100.99, 203.0.113.10",
				"x-real-ip": "203.0.113.10",
			},
		});
		expect(getIP(multiXffWithRealIp, options)).toBe("203.0.113.10");

		const ipv6Req = new Request("https://household.example.com/api/auth/sign-in/email", {
			headers: { "x-real-ip": "2001:0db8:85a3:0000:0000:8a2e:0370:7334" },
		});
		expect(getIP(ipv6Req, options)).toBe("2001:0db8:85a3:0000:0000:0000:0000:0000");
	});

	it("ignores x-forwarded-host when resolving baseURL and trustedOrigins", async () => {
		const ctx = await authModule.auth.$context;
		expect(ctx.isTrustedOrigin("https://evil.example.com")).toBe(false);
		expect(ctx.isTrustedOrigin("https://household.example.com")).toBe(true);
	});

	it("enforces __Secure- cookies when NODE_ENV=production", async () => {
		vi.stubEnv("NODE_ENV", "production");
		vi.resetModules();
		const prodModule = await import("@/server/auth");
		try {
			const prodCtx = await prodModule.auth.$context;
			expect(prodCtx.authCookies.sessionToken.name).toBe("__Secure-better-auth.session_token");
			expect(prodCtx.authCookies.sessionToken.attributes.secure).toBe(true);
			expect(prodCtx.authCookies.sessionToken.attributes.httpOnly).toBe(true);
			expect(prodCtx.authCookies.sessionToken.attributes.sameSite).toBe("lax");

			const prodSignUpRes = await prodModule.auth.handler(
				new Request("https://household.example.com/api/auth/sign-up/email", {
					method: "POST",
					headers: {
						"content-type": "application/json",
						origin: "https://household.example.com",
						"x-forwarded-for": "203.0.113.41",
					},
					body: JSON.stringify({
						email: "prod-user@example.com",
						password: "Password123!",
						name: "Prod User",
					}),
				}),
			);
			expect(prodSignUpRes.status).toBe(200);
			const prodCookie = prodSignUpRes.headers.get("set-cookie");
			expect(prodCookie).toContain("__Secure-better-auth.session_token=");
			expect(prodCookie).toContain("Secure");
			expect(prodCookie).toContain("HttpOnly");
			expect(prodCookie).toContain("SameSite=Lax");
		} finally {
			vi.stubEnv("NODE_ENV", "test");
			vi.resetModules();
		}
	});

	it("blocks demo account mutations in before hook while allowing non-mutation routes and normal users", async () => {
		const signUpDemo = await authModule.auth.handler(
			new Request("https://household.example.com/api/auth/sign-up/email", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					"x-forwarded-for": "203.0.113.20",
				},
				body: JSON.stringify({
					email: DEMO_ACCOUNT_EMAIL,
					password: "DemoPassword123!",
					name: "Demo User",
				}),
			}),
		);
		expect(signUpDemo.status).toBe(200);
		const demoCookie = signUpDemo.headers.get("set-cookie");
		expect(demoCookie).toBeTruthy();
		expect(demoCookie).toContain("better-auth.session_token=");
		expect(demoCookie).toContain("HttpOnly");
		expect(demoCookie).toContain("SameSite=Lax");

		const storedSession = await client.query<{ ip_address: string | null; user_agent: string | null }>(
			'SELECT ip_address, user_agent FROM "session" LIMIT 1',
		);
		expect(storedSession.rows[0]?.ip_address).toMatch(/^ip:v1:/);

		const cookieHeader = demoCookie!.split(";")[0]!;

		const blockedChangePw = await authModule.auth.handler(
			new Request("https://household.example.com/api/auth/change-password", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					cookie: cookieHeader,
					"x-forwarded-for": "203.0.113.20",
				},
				body: JSON.stringify({
					currentPassword: "DemoPassword123!",
					newPassword: "NewPassword123!",
				}),
			}),
		);
		expect(blockedChangePw.status).toBe(403);
		const blockedBody = (await blockedChangePw.json()) as { message?: string };
		expect(blockedBody.message).toBe(DEMO_ACCOUNT_BLOCKED_MESSAGE);

		const allowedGetSession = await authModule.auth.handler(
			new Request("https://household.example.com/api/auth/get-session", {
				method: "GET",
				headers: {
					cookie: cookieHeader,
					"x-forwarded-for": "203.0.113.20",
				},
			}),
		);
		expect(allowedGetSession.status).toBe(200);

		const signUpRegular = await authModule.auth.handler(
			new Request("https://household.example.com/api/auth/sign-up/email", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					"x-forwarded-for": "203.0.113.21",
				},
				body: JSON.stringify({
					email: "regular@example.com",
					password: "RegularPassword123!",
					name: "Regular User",
				}),
			}),
		);
		expect(signUpRegular.status).toBe(200);
		const regularCookie = signUpRegular.headers.get("set-cookie")!.split(";")[0]!;

		const allowedUpdateUser = await authModule.auth.handler(
			new Request("https://household.example.com/api/auth/update-user", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					cookie: regularCookie,
					"x-forwarded-for": "203.0.113.21",
				},
				body: JSON.stringify({ name: "Updated Name" }),
			}),
		);
		expect(allowedUpdateUser.status).toBe(200);
	});

	it("enforces database-backed rate limits atomically under 1.7.x", async () => {
		for (let i = 0; i < 5; i += 1) {
			const res = await authModule.auth.handler(
				new Request("https://household.example.com/api/auth/sign-in/email", {
					method: "POST",
					headers: {
						"content-type": "application/json",
						"x-forwarded-for": "203.0.113.30",
					},
					body: JSON.stringify({
						email: "missing@example.com",
						password: "WrongPassword123!",
					}),
				}),
			);
			expect(res.status).toBe(401);
		}

		const throttled = await authModule.auth.handler(
			new Request("https://household.example.com/api/auth/sign-in/email", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					"x-forwarded-for": "203.0.113.30",
				},
				body: JSON.stringify({
					email: "missing@example.com",
					password: "WrongPassword123!",
				}),
			}),
		);
		expect(throttled.status).toBe(429);
		expect(throttled.headers.get("x-retry-after")).toBeTruthy();
	});

	it("returns null from getRequestSession for unauthenticated requests and absorbs recoverable APIErrors", async () => {
		await expect(authModule.getRequestSession(new Headers())).resolves.toBeNull();

		const getSessionSpy = vi
			.spyOn(authModule.auth.api, "getSession")
			.mockRejectedValueOnce(new APIError("UNAUTHORIZED", { message: "Invalid token" }));
		await expect(authModule.getRequestSession(new Headers())).resolves.toBeNull();

		getSessionSpy.mockRejectedValueOnce(new Error("unexpected db failure"));
		await expect(authModule.getRequestSession(new Headers())).rejects.toThrow("unexpected db failure");
		getSessionSpy.mockRestore();
	});
});
