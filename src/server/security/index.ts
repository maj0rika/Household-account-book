import { eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { securityEvents, securityRateLimits } from "@/server/db/schema";
import {
	type RequestFingerprint,
	type SecurityEventType,
	assertTrustedOrigin,
	buildRequestFingerprint,
	extractRequestIp,
	hashSecurityValue,
	minimizeSessionIpAddress,
	minimizeSessionUserAgent,
	sanitizeTextInput,
	validateImagePayload,
} from "./policy";

export {
	assertTrustedOrigin,
	buildRequestFingerprint,
	extractRequestIp,
	hashSecurityValue,
	minimizeSessionIpAddress,
	minimizeSessionUserAgent,
	sanitizeTextInput,
	validateImagePayload,
};

export interface RateLimitDecision {
	allowed: boolean;
	retryAfterSeconds: number;
	reason: string;
	scope: string;
	keyHash: string;
}

interface ConsumeRateLimitInput {
	scope: string;
	subject: string;
	max: number;
	windowSeconds: number;
	reason: string;
	blockSeconds?: number;
	escalateAfter?: number;
}

type SecurityEventMetadataValue = string | number | boolean | null;
const DEFAULT_ESCALATION_AFTER = 3;
const DEFAULT_BLOCK_SECONDS = 15 * 60;

function toRetryAfterSeconds(retryAt: Date): number {
	return Math.max(1, Math.ceil((retryAt.getTime() - Date.now()) / 1000));
}

export async function recordSecurityEvent(input: {
	type: SecurityEventType;
	scope: string;
	keyHash: string | null;
	reason: string;
	metadata?: Record<string, SecurityEventMetadataValue>;
}): Promise<void> {
	await db.insert(securityEvents).values({
		type: input.type,
		scope: input.scope,
		keyHash: input.keyHash,
		reason: input.reason,
		metadata: input.metadata ?? null,
	});
}

export async function consumeRateLimit(
	input: ConsumeRateLimitInput,
): Promise<RateLimitDecision> {
	const keyHash = hashSecurityValue(input.subject, input.scope);
	const now = new Date();
	const windowMs = input.windowSeconds * 1000;
	const escalationAfter = input.escalateAfter ?? DEFAULT_ESCALATION_AFTER;
	const blockSeconds = input.blockSeconds ?? DEFAULT_BLOCK_SECONDS;

	return db.transaction(async (tx) => {
		const result = await tx.execute(sql`
			SELECT
				id,
				request_count,
				window_started_at,
				blocked_until,
				consecutive_blocks
			FROM security_rate_limits
			WHERE scope = ${input.scope}
				AND key_hash = ${keyHash}
			FOR UPDATE
		`);

		const row = result.rows[0] as
			| {
					id: string;
					request_count: number | string;
					window_started_at: Date | string;
					blocked_until: Date | string | null;
					consecutive_blocks: number | string;
			  }
			| undefined;

		if (!row) {
			await tx.insert(securityRateLimits).values({
				scope: input.scope,
				keyHash,
				requestCount: 1,
				windowStartedAt: now,
				blockedUntil: null,
				consecutiveBlocks: 0,
				lastReason: input.reason,
				updatedAt: now,
			});

			return {
				allowed: true,
				retryAfterSeconds: 0,
				reason: input.reason,
				scope: input.scope,
				keyHash,
			};
		}

		const requestCount = Number(row.request_count);
		const consecutiveBlocks = Number(row.consecutive_blocks);
		const windowStartedAt = new Date(row.window_started_at);
		const blockedUntil = row.blocked_until ? new Date(row.blocked_until) : null;

		if (blockedUntil && blockedUntil.getTime() > now.getTime()) {
			return {
				allowed: false,
				retryAfterSeconds: toRetryAfterSeconds(blockedUntil),
				reason: input.reason,
				scope: input.scope,
				keyHash,
			};
		}

		const windowExpired = now.getTime() - windowStartedAt.getTime() >= windowMs;
		if (windowExpired) {
			await tx
				.update(securityRateLimits)
				.set({
					requestCount: 1,
					windowStartedAt: now,
					blockedUntil: null,
					consecutiveBlocks: 0,
					lastReason: input.reason,
					updatedAt: now,
				})
				.where(eq(securityRateLimits.id, row.id));

			return {
				allowed: true,
				retryAfterSeconds: 0,
				reason: input.reason,
				scope: input.scope,
				keyHash,
			};
		}

		const nextCount = requestCount + 1;
		if (nextCount <= input.max) {
			await tx
				.update(securityRateLimits)
				.set({
					requestCount: nextCount,
					blockedUntil: null,
					consecutiveBlocks: 0,
					lastReason: input.reason,
					updatedAt: now,
				})
				.where(eq(securityRateLimits.id, row.id));

			return {
				allowed: true,
				retryAfterSeconds: 0,
				reason: input.reason,
				scope: input.scope,
				keyHash,
			};
		}

		const nextConsecutiveBlocks = consecutiveBlocks + 1;
		const retryAt = nextConsecutiveBlocks >= escalationAfter
			? new Date(now.getTime() + blockSeconds * 1000)
			: new Date(windowStartedAt.getTime() + windowMs);

		await tx
			.update(securityRateLimits)
			.set({
				requestCount: nextCount,
				blockedUntil: retryAt,
				consecutiveBlocks: nextConsecutiveBlocks,
				lastReason: input.reason,
				updatedAt: now,
			})
			.where(eq(securityRateLimits.id, row.id));

		return {
			allowed: false,
			retryAfterSeconds: toRetryAfterSeconds(retryAt),
			reason: input.reason,
			scope: input.scope,
			keyHash,
		};
	});
}

export function buildRateLimitHeaders(decision: RateLimitDecision): HeadersInit {
	if (decision.allowed || decision.retryAfterSeconds <= 0) {
		return {};
	}

	return {
		"X-Retry-After": String(decision.retryAfterSeconds),
	};
}

export async function consumeIpAnomalyLimit(input: {
	fingerprint: RequestFingerprint;
	scope: string;
	reason: string;
	metadata?: Record<string, SecurityEventMetadataValue>;
}): Promise<RateLimitDecision | null> {
	if (!input.fingerprint.ipAddress) {
		return null;
	}

	const decision = await consumeRateLimit({
		scope: input.scope,
		subject: input.fingerprint.ipAddress,
		max: 10,
		windowSeconds: 10 * 60,
		reason: input.reason,
	});

	await recordSecurityEvent({
		type: decision.allowed ? "invalid_input" : "blocked",
		scope: input.scope,
		keyHash: input.fingerprint.ipHash,
		reason: input.reason,
		metadata: input.metadata,
	});

	return decision;
}
