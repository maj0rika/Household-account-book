import type { Transaction, TransactionGroup } from "@/types";

const KRW = new Intl.NumberFormat("ko-KR");

export function formatCurrency(amount: number): string {
	return `${KRW.format(amount)}원`;
}

export function formatSignedCurrency(amount: number, type: "income" | "expense"): string {
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

// 타임존 안전 날짜 유틸리티 (H5 수정 — KST 기준)
export function getKSTDate(): Date {
	const now = new Date();
	// UTC 기준에서 KST(+9) 오프셋 적용
	const kstOffset = 9 * 60 * 60 * 1000;
	const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
	return new Date(utc + kstOffset);
}

export function formatDateLocal(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

// month 파라미터 검증 유틸리티
export function isValidMonth(month: string): boolean {
	const match = month.match(/^(\d{4})-(\d{2})$/);
	if (!match) return false;
	const m = Number(match[2]);
	return m >= 1 && m <= 12;
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
	const today = new Date();
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

export function getCurrentMonth(): string {
	const kst = getKSTDate();
	const year = kst.getFullYear();
	const month = String(kst.getMonth() + 1).padStart(2, "0");
	return `${year}-${month}`;
}

export function formatMonth(month: string): string {
	const [year, m] = month.split("-");
	return `${year}년 ${Number(m)}월`;
}
