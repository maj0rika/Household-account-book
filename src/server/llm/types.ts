export interface ParsedTransaction {
	date: string; // YYYY-MM-DD
	type: "income" | "expense";
	category: string; // 카테고리명 (식비, 교통 등)
	description: string; // 설명 (김치찌개, 스타벅스 등)
	amount: number; // 금액 (원 단위)
	isRecurring?: boolean; // 고정 거래 여부
	dayOfMonth?: number; // 고정 거래 매월 날짜 (1~31)
}

export interface ParseResult {
	success: true;
	transactions: ParsedTransaction[];
}

export interface ParseError {
	success: false;
	error: string;
}

export type ParseResponse = ParseResult | ParseError;
