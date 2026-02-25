import type { Transaction, TransactionGroup } from "@/types";

const KRW = new Intl.NumberFormat("ko-KR");

export function formatCurrency(amount: number): string {
	return `${KRW.format(amount)}원`;
}

export function formatSignedCurrency(amount: number, type: "income" | "expense"): string {
	const sign = type === "income" ? "+" : "-";
	return `${sign}${KRW.format(amount)}원`;
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
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	return `${year}-${month}`;
}

export function formatMonth(month: string): string {
	const [year, m] = month.split("-");
	return `${year}년 ${Number(m)}월`;
}
