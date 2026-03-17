/**
 * 보안 모듈 — Rate Limiting & 이상 탐지
 *
 * 이 파일은 두 가지 핵심 기능을 제공한다:
 * 1. Rate Limiting: 특정 사용자/IP가 짧은 시간에 과도한 요청을 보내는 것을 막는다.
 *    - DB 기반 슬라이딩 윈도우 방식으로, 서버가 여러 대여도 상태가 공유된다.
 *    - 반복 위반 시 차단 시간이 점진적으로 늘어나는 에스컬레이션 메커니즘이 있다.
 * 2. 이상 탐지: origin 불일치, 비인가 접근, 의심스러운 입력 패턴 등의 보안 이벤트를
 *    DB에 기록하여 사후 분석과 모니터링에 활용한다.
 *
 * policy.ts에서 가져온 유틸(IP 추출, 해싱, 입력 검증 등)도 함께 re-export한다.
 */
import { and, eq } from "drizzle-orm";

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

// policy.ts의 보안 유틸들을 외부에서 바로 쓸 수 있도록 re-export
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

/** Rate limiter가 내리는 판정 결과. 호출자는 이걸 보고 요청을 허용/거부한다. */
export interface RateLimitDecision {
	/** true면 요청 허용, false면 차단 */
	allowed: boolean;
	/** 차단된 경우 몇 초 후에 재시도 가능한지 (허용이면 0) */
	retryAfterSeconds: number;
	/** 어떤 이유로 rate limit을 소비했는지 (ex: "login_attempt", "image_upload") */
	reason: string;
	/** 어떤 기능/엔드포인트에 대한 제한인지 (ex: "auth:login", "api:parse") */
	scope: string;
	/** subject를 해싱한 값 — 로그 추적용이며 원본 IP/ID는 저장하지 않는다 */
	keyHash: string;
}

/** consumeRateLimit 함수의 입력 파라미터 */
interface ConsumeRateLimitInput {
	/** 제한을 걸 기능 영역 (ex: "auth:login") */
	scope: string;
	/** 제한 대상 식별자 — IP 주소나 사용자 ID 등 (DB에는 해싱되어 저장) */
	subject: string;
	/** 윈도우 내 최대 허용 요청 수 */
	max: number;
	/** 윈도우 크기 (초 단위). 이 시간 동안 max 횟수까지 허용 */
	windowSeconds: number;
	/** 이 rate limit이 왜 소비되었는지 사유 */
	reason: string;
	/** 에스컬레이션 발동 시 차단할 시간 (초). 기본 15분 */
	blockSeconds?: number;
	/** 연속 차단 몇 회 이후 에스컬레이션할지. 기본 3회 */
	escalateAfter?: number;
}

type SecurityEventMetadataValue = string | number | boolean | null;

// 연속 차단 3회 이상이면 단순 윈도우 대기가 아닌 장기 차단(에스컬레이션)으로 전환
const DEFAULT_ESCALATION_AFTER = 3;
// 에스컬레이션 시 기본 차단 시간: 15분
const DEFAULT_BLOCK_SECONDS = 15 * 60;

/**
 * 이상 탐지 사유(reason)를 보안 이벤트 타입으로 매핑한다.
 * 각 reason이 어떤 카테고리의 위협인지 분류하여 이벤트 테이블에 저장할 때 쓴다.
 *
 * - origin_mismatch: CSRF 방어에서 Origin 헤더가 일치하지 않음
 * - unauthorized_access: 인증 없이 보호된 리소스에 접근 시도
 * - base64_only_text / invalid_base64_image: 이미지로 위장한 텍스트 주입 등 의심 패턴
 * - 그 외: 일반적인 잘못된 입력
 */
function resolveAnomalyEventType(reason: string): SecurityEventType {
	if (reason === "origin_mismatch") {
		return "origin_mismatch";
	}

	if (reason === "unauthorized_access") {
		return "unauthorized";
	}

	if (reason === "base64_only_text" || reason === "invalid_base64_image") {
		return "suspicious_pattern";
	}

	return "invalid_input";
}

/**
 * 차단 해제 시각(retryAt)까지 남은 시간을 초 단위로 계산한다.
 * 최소 1초를 보장하여 클라이언트에게 "0초 후 재시도" 같은 혼란스러운 값을 주지 않는다.
 */
function toRetryAfterSeconds(retryAt: Date): number {
	return Math.max(1, Math.ceil((retryAt.getTime() - Date.now()) / 1000));
}

/**
 * 보안 이벤트를 DB에 기록한다.
 * 실시간 차단 판단에는 사용되지 않고, 사후 분석·모니터링·알림 용도이다.
 * 대시보드에서 "최근 의심스러운 활동" 같은 걸 보여줄 때 이 테이블을 조회한다.
 */
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

/**
 * Rate limit 토큰을 하나 소비하고, 허용/차단 여부를 반환한다.
 *
 * 동작 흐름 (DB 트랜잭션 안에서 원자적으로 실행):
 * 1. 해당 scope+subject 조합의 row가 없으면 새로 생성 (INSERT ... ON CONFLICT DO NOTHING)
 * 2. 해당 row를 SELECT ... FOR UPDATE로 잠금 (동시 요청 간 경합 방지)
 * 3. 이미 차단 상태인지 확인 → 차단 중이면 즉시 거부
 * 4. 윈도우가 만료되었으면 카운터를 리셋하고 허용
 * 5. 윈도우 내에서 아직 한도 이내면 카운터만 올리고 허용
 * 6. 한도를 초과하면 차단 — 에스컬레이션 여부에 따라 차단 시간이 달라진다:
 *    - 연속 차단 < escalateAfter: 현재 윈도우 끝까지만 차단 (가벼운 패널티)
 *    - 연속 차단 >= escalateAfter: blockSeconds만큼 장기 차단 (반복 악용 방지)
 */
export async function consumeRateLimit(
	input: ConsumeRateLimitInput,
): Promise<RateLimitDecision> {
	// subject(IP 등)를 scope와 함께 해싱하여 DB 키로 사용 — 원본 값은 저장하지 않는다
	const keyHash = hashSecurityValue(input.subject, input.scope);
	const now = new Date();
	const windowMs = input.windowSeconds * 1000;
	const escalationAfter = input.escalateAfter ?? DEFAULT_ESCALATION_AFTER;
	const blockSeconds = input.blockSeconds ?? DEFAULT_BLOCK_SECONDS;

	return db.transaction(async (tx) => {
		// 1단계: row가 없을 때만 초기값으로 삽입. 이미 존재하면 아무것도 하지 않음 (UPSERT 패턴)
		await tx
			.insert(securityRateLimits)
			.values({
				scope: input.scope,
				keyHash,
				requestCount: 0,
				windowStartedAt: now,
				blockedUntil: null,
				consecutiveBlocks: 0,
				lastReason: input.reason,
				updatedAt: now,
			})
			.onConflictDoNothing({
				target: [securityRateLimits.scope, securityRateLimits.keyHash],
			});

		// 2단계: 해당 row를 FOR UPDATE로 잠금 — 동시에 들어온 요청들이 순차 처리되도록 보장
		const [row] = await tx
			.select({
				id: securityRateLimits.id,
				requestCount: securityRateLimits.requestCount,
				windowStartedAt: securityRateLimits.windowStartedAt,
				blockedUntil: securityRateLimits.blockedUntil,
				consecutiveBlocks: securityRateLimits.consecutiveBlocks,
			})
			.from(securityRateLimits)
			.where(
				and(
					eq(securityRateLimits.scope, input.scope),
					eq(securityRateLimits.keyHash, keyHash),
				),
			)
			.for("update");

		if (!row) {
			throw new Error("rate limit row를 조회하지 못했습니다.");
		}

		const requestCount = row.requestCount;
		const consecutiveBlocks = row.consecutiveBlocks;
		const windowStartedAt = row.windowStartedAt;
		const blockedUntil = row.blockedUntil;

		// 3단계: 현재 차단 상태인지 확인 — 차단 시간이 아직 안 지났으면 즉시 거부
		if (blockedUntil && blockedUntil.getTime() > now.getTime()) {
			return {
				allowed: false,
				retryAfterSeconds: toRetryAfterSeconds(blockedUntil),
				reason: input.reason,
				scope: input.scope,
				keyHash,
			};
		}

		// 4단계: 윈도우가 만료되었으면 깨끗하게 리셋하고 새 윈도우 시작 (이번 요청을 1회로 카운트)
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

		// 5단계: 아직 윈도우 내이고 한도 이내 → 카운터만 올리고 허용
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

		// 6단계: 한도 초과 — 차단 시간 결정
		// 연속 차단이 escalateAfter 미만: 현재 윈도우 끝까지만 대기 (다음 윈도우에서 다시 시도 가능)
		// 연속 차단이 escalateAfter 이상: 장기 차단 (악의적 반복 시도로 간주)
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

/**
 * Rate limit 차단 판정을 HTTP 응답 헤더로 변환한다.
 * 차단된 경우에만 X-Retry-After 헤더를 설정하여,
 * 클라이언트가 몇 초 후에 재시도해야 하는지 알려준다.
 */
export function buildRateLimitHeaders(decision: RateLimitDecision): HeadersInit {
	if (decision.allowed || decision.retryAfterSeconds <= 0) {
		return {};
	}

	return {
		"X-Retry-After": String(decision.retryAfterSeconds),
	};
}

/**
 * IP 기반 이상 탐지 rate limiter.
 * 비정상적인 요청(origin 불일치, 비인가 접근, 의심 패턴 등)이 감지되었을 때 호출한다.
 *
 * consumeRateLimit과의 차이:
 * - 고정된 한도(10분에 10회)를 사용하여 호출자가 한도를 설정할 필요 없음
 * - 자동으로 보안 이벤트를 DB에 기록 (어떤 IP에서 어떤 이상이 발생했는지)
 * - IP가 없는 경우(ex: 서버 내부 호출) null을 반환하여 제한을 건너뜀
 */
export async function consumeIpAnomalyLimit(input: {
	fingerprint: RequestFingerprint;
	scope: string;
	reason: string;
	metadata?: Record<string, SecurityEventMetadataValue>;
}): Promise<RateLimitDecision | null> {
	// IP가 없으면 rate limit을 적용할 대상이 없으므로 건너뜀
	if (!input.fingerprint.ipAddress) {
		return null;
	}

	// 10분 윈도우에 10회까지 허용 — 이상 탐지용이므로 비교적 관대한 한도
	const decision = await consumeRateLimit({
		scope: input.scope,
		subject: input.fingerprint.ipAddress,
		max: 10,
		windowSeconds: 10 * 60,
		reason: input.reason,
	});

	// 허용/차단 여부와 관계없이 모든 이상 탐지 이벤트를 기록 (사후 분석용)
	await recordSecurityEvent({
		type: resolveAnomalyEventType(input.reason),
		scope: input.scope,
		keyHash: input.fingerprint.ipHash,
		reason: input.reason,
		metadata: {
			...(input.metadata ?? {}),
			blocked: !decision.allowed,
			retryAfterSeconds: decision.retryAfterSeconds,
		},
	});

	return decision;
}
