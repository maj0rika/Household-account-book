import { describe, expect, it } from "vitest";

import {
	formatClampedMonthDate,
	getCurrentMonth,
	getMonthDateRange,
	getTodayString,
	resolveMonth,
} from "../format";

describe("format KST & month helpers", () => {
	it("UTC 15:00 이후에는 KST 기준 다음 날과 다음 달로 계산한다", () => {
		const beforeKstMidnight = new Date("2026-11-30T14:59:59.999Z");
		const atKstMidnight = new Date("2026-11-30T15:00:00.000Z");

		expect(getTodayString(beforeKstMidnight)).toBe("2026-11-30");
		expect(getCurrentMonth(beforeKstMidnight)).toBe("2026-11");

		expect(getTodayString(atKstMidnight)).toBe("2026-12-01");
		expect(getCurrentMonth(atKstMidnight)).toBe("2026-12");
	});

	it("월 범위와 연말·윤년 말일을 정확히 계산한다", () => {
		expect(getMonthDateRange("2026-12")).toEqual({
			year: 2026,
			month: 12,
			startDate: "2026-12-01",
			nextMonthStart: "2027-01-01",
			daysInMonth: 31,
		});

		expect(getMonthDateRange("2024-02").daysInMonth).toBe(29);
		expect(getMonthDateRange("2026-02").daysInMonth).toBe(28);
	});

	it("말일을 넘는 고정거래 일자를 해당 월 말일로 보정한다", () => {
		expect(formatClampedMonthDate("2026-02", 31)).toBe("2026-02-28");
		expect(formatClampedMonthDate("2024-02", 31)).toBe("2024-02-29");
		expect(formatClampedMonthDate("2026-04", 31)).toBe("2026-04-30");
		expect(formatClampedMonthDate("2026-05", 15)).toBe("2026-05-15");
	});

	it("유효하지 않은 month 파라미터는 현재 KST 월로 폴백한다", () => {
		const now = new Date("2026-11-30T15:00:00.000Z");
		expect(resolveMonth("2026-10", now)).toBe("2026-10");
		expect(resolveMonth("2026-13", now)).toBe("2026-12");
		expect(resolveMonth(undefined, now)).toBe("2026-12");
	});
});
