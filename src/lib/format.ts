import type { Transaction, TransactionGroup } from "@/types";

const KRW = new Intl.NumberFormat("ko-KR");

export function formatCurrency(amount: number): string {
	return `${KRW.format(amount)}원`;
}

export function formatSignedCurrency(amount: number, type: "income" | "expense" | "transfer"): string {
	if (type === "transfer") {
		return KRW.format(amount) + "원";
	}
	const sign = type === "income" ? "+" : "-";
	return `${sign}${KRW.format(amount)}원`;
}

// 금액 입력 포맷팅 유틸리티 (M4, M11 수정 — 중앙화)
export function formatCurrencyInput(rawDigits: string): string {
	if (!rawDigits) return "";
	const num = Number(rawDigits);
	if (Number.isNaN(num)) return "";
	if (num === 0) return "0";
	return num.toLocaleString("ko-KR");
}

export function parseCurrencyInput(formatted: string): string {
	return formatted.replace(/[^\d]/g, "");
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 타임존 안전 날짜 유틸리티 (호스트 타임존/DST와 무관하게 KST 기준 달력 값 생성)
export function getKSTDate(now: Date = new Date()): Date {
	const kst = new Date(now.getTime() + KST_OFFSET_MS);
	return new Date(
		kst.getUTCFullYear(),
		kst.getUTCMonth(),
		kst.getUTCDate(),
		kst.getUTCHours(),
		kst.getUTCMinutes(),
		kst.getUTCSeconds(),
		kst.getUTCMilliseconds(),
	);
}

export function requireIncomeExpenseType(type: string): "income" | "expense" {
	if (type === "income" || type === "expense") return type;
	throw new Error(`수입/지출 유형이 아닙니다: ${type}`);
}

export function formatDateLocal(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

// KST 기준 오늘 날짜 문자열 (YYYY-MM-DD)
export function getTodayString(now: Date = new Date()): string {
	return formatDateLocal(getKSTDate(now));
}

// month 파라미터 검증 유틸리티
export function isValidMonth(month: string): boolean {
	const match = month.match(/^(\d{4})-(\d{2})$/);
	if (!match) return false;
	const m = Number(match[2]);
	return m >= 1 && m <= 12;
}

export function resolveMonth(rawMonth?: string, now: Date = new Date()): string {
	return rawMonth && isValidMonth(rawMonth) ? rawMonth : getCurrentMonth(now);
}

// YYYY-MM 문자열에서 반열린 월 범위 `[startDate, nextMonthStart)`와 말일 수를 계산한다.
export function getMonthDateRange(month: string): {
	year: number;
	month: number;
	startDate: string;
	nextMonthStart: string;
	daysInMonth: number;
} {
	const [year, m] = month.split("-").map(Number);
	const monthStr = `${year}-${String(m).padStart(2, "0")}`;
	const nextYear = m === 12 ? year + 1 : year;
	const nextM = m === 12 ? 1 : m + 1;

	return {
		year,
		month: m,
		startDate: `${monthStr}-01`,
		nextMonthStart: `${nextYear}-${String(nextM).padStart(2, "0")}-01`,
		daysInMonth: new Date(Date.UTC(year, m, 0)).getUTCDate(),
	};
}

// 말일을 초과하는 일자(예: 2월 31일)를 해당 월의 마지막 날짜로 보정해 YYYY-MM-DD를 반환한다.
export function formatClampedMonthDate(month: string, dayOfMonth: number): string {
	const { year, month: m, daysInMonth } = getMonthDateRange(month);
	const day = Math.min(Math.max(1, dayOfMonth), daysInMonth);
	return `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// URL 쿼리 파라미터 유틸리티 (L7 수정 — 중앙화)
export function buildSearchQuery(
	searchParams: URLSearchParams,
	updates: Record<string, string | null>,
): string {
	const params = new URLSearchParams(searchParams.toString());
	for (const [key, value] of Object.entries(updates)) {
		if (value === null) {
			params.delete(key);
		} else {
			params.set(key, value);
		}
	}
	const query = params.toString();
	return query ? `?${query}` : "?";
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export function formatRelativeDate(dateStr: string): string {
	const today = getKSTDate();
	today.setHours(0, 0, 0, 0);
	const target = new Date(dateStr + "T00:00:00");
	const diff = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

	if (diff === 0) return "오늘";
	if (diff === 1) return "어제";
	if (diff === 2) return "그제";

	const month = target.getMonth() + 1;
	const day = target.getDate();
	const dayName = DAY_NAMES[target.getDay()];
	return `${month}월 ${day}일 (${dayName})`;
}

export function groupTransactionsByDate(transactions: Transaction[]): TransactionGroup[] {
	const map = new Map<string, Transaction[]>();

	for (const tx of transactions) {
		const existing = map.get(tx.date);
		if (existing) {
			existing.push(tx);
		} else {
			map.set(tx.date, [tx]);
		}
	}

	const groups: TransactionGroup[] = [];
	for (const [date, txs] of map) {
		groups.push({
			date,
			label: formatRelativeDate(date),
			transactions: txs,
		});
	}

	groups.sort((a, b) => b.date.localeCompare(a.date));
	return groups;
}

export function getCurrentMonth(now: Date = new Date()): string {
	const kst = getKSTDate(now);
	const year = kst.getFullYear();
	const month = String(kst.getMonth() + 1).padStart(2, "0");
	return `${year}-${month}`;
}

export function formatMonth(month: string): string {
	const [year, m] = month.split("-");
	return `${year}년 ${Number(m)}월`;
}
