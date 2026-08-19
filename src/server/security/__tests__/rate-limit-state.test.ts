import { describe, expect, it } from "vitest";

import { advanceRateLimit } from "../rate-limit-state";

const windowMs = 60_000;
const now = new Date("2026-08-18T00:00:00.000Z");

describe("advanceRateLimit", () => {
	it("활성 차단 중이면 카운터를 올리지 않는다", () => {
		const blockedUntil = new Date(now.getTime() + 10_000);
		const result = advanceRateLimit(
			{
				requestCount: 21,
				windowStartedAt: now,
				blockedUntil,
				consecutiveBlocks: 1,
			},
			{ now, windowMs, max: 20, escalationAfter: 3, blockSeconds: 900 },
		);

		expect(result.allowed).toBe(false);
		expect(result.next.consecutiveBlocks).toBe(1);
		expect(result.next.requestCount).toBe(21);
		expect(result.retryAt).toEqual(blockedUntil);
	});

	it("한도 이내 허용이 연속 차단 카운터를 지우지 않는다", () => {
		const result = advanceRateLimit(
			{
				requestCount: 3,
				windowStartedAt: now,
				blockedUntil: null,
				consecutiveBlocks: 2,
			},
			{ now, windowMs, max: 20, escalationAfter: 3, blockSeconds: 900 },
		);

		expect(result.allowed).toBe(true);
		expect(result.next.consecutiveBlocks).toBe(2);
		expect(result.next.requestCount).toBe(4);
	});

	it("윈도우가 차단으로 끝나면 다음 윈도우에서 연속 차단을 유지한다", () => {
		const later = new Date(now.getTime() + windowMs);
		const result = advanceRateLimit(
			{
				requestCount: 21,
				windowStartedAt: now,
				blockedUntil: later,
				consecutiveBlocks: 2,
			},
			{ now: later, windowMs, max: 20, escalationAfter: 3, blockSeconds: 900 },
		);

		expect(result.allowed).toBe(true);
		expect(result.next.requestCount).toBe(1);
		expect(result.next.consecutiveBlocks).toBe(2);
		expect(result.next.blockedUntil).toBeNull();
	});

	it("세 번째 연속 차단에서 장기 차단으로 올린다", () => {
		const result = advanceRateLimit(
			{
				requestCount: 20,
				windowStartedAt: now,
				blockedUntil: null,
				consecutiveBlocks: 2,
			},
			{ now, windowMs, max: 20, escalationAfter: 3, blockSeconds: 900 },
		);

		expect(result.allowed).toBe(false);
		expect(result.next.consecutiveBlocks).toBe(3);
		expect(result.retryAt?.getTime()).toBe(now.getTime() + 900_000);
	});
});
