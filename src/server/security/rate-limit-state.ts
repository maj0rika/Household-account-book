export interface RateLimitRowState {
	requestCount: number;
	windowStartedAt: Date;
	blockedUntil: Date | null;
	consecutiveBlocks: number;
}

export interface RateLimitAdvanceInput {
	now: Date;
	windowMs: number;
	max: number;
	escalationAfter: number;
	blockSeconds: number;
}

export interface RateLimitAdvanceResult {
	next: RateLimitRowState;
	allowed: boolean;
	retryAt: Date | null;
}

export function advanceRateLimit(
	row: RateLimitRowState,
	input: RateLimitAdvanceInput,
): RateLimitAdvanceResult {
	const { now, windowMs, max, escalationAfter, blockSeconds } = input;

	if (row.blockedUntil && row.blockedUntil.getTime() > now.getTime()) {
		return {
			next: row,
			allowed: false,
			retryAt: row.blockedUntil,
		};
	}

	const windowExpired = now.getTime() - row.windowStartedAt.getTime() >= windowMs;
	if (windowExpired) {
		const keepConsecutiveBlocks = Boolean(row.blockedUntil);
		return {
			next: {
				requestCount: 1,
				windowStartedAt: now,
				blockedUntil: null,
				consecutiveBlocks: keepConsecutiveBlocks ? row.consecutiveBlocks : 0,
			},
			allowed: true,
			retryAt: null,
		};
	}

	const nextCount = row.requestCount + 1;
	if (nextCount <= max) {
		return {
			next: {
				...row,
				requestCount: nextCount,
				blockedUntil: null,
			},
			allowed: true,
			retryAt: null,
		};
	}

	const nextConsecutiveBlocks = row.consecutiveBlocks + 1;
	const retryAt = nextConsecutiveBlocks >= escalationAfter
		? new Date(now.getTime() + blockSeconds * 1000)
		: new Date(row.windowStartedAt.getTime() + windowMs);

	return {
		next: {
			requestCount: nextCount,
			windowStartedAt: row.windowStartedAt,
			blockedUntil: retryAt,
			consecutiveBlocks: nextConsecutiveBlocks,
		},
		allowed: false,
		retryAt,
	};
}
