// --- 거래 파싱 타입 ---
export interface ParsedTransaction {
	date: string; // YYYY-MM-DD
	type: "income" | "expense";
	category: string; // 카테고리명 (식비, 교통 등)
	description: string; // 설명 (김치찌개, 스타벅스 등)
	amount: number; // 금액 (원 단위)
	isRecurring?: boolean; // 고정 거래 여부
	dayOfMonth?: number; // 고정 거래 매월 날짜 (1~31)
	suggestedCategory?: string; // 기존 카테고리에 매칭 불가 시 LLM이 제안하는 새 카테고리명
	accountId?: string | null; // 연결 계좌 ID (자산-거래 연동)
}

// --- 자산/부채 파싱 타입 ---
export interface ParsedAccount {
	name: string; // "카카오뱅크", "신한카드" 등
	type: "asset" | "debt";
	subType: "bank" | "cash" | "savings" | "investment" | "credit_card" | "loan" | "other";
	icon: string; // 이모지
	balance: number; // 원 단위 (양수)
}

// --- 통합 응답 타입 ---
export interface UnifiedParseResult {
	success: true;
	intent: "transaction" | "account";
	transactions: ParsedTransaction[];
	accounts: ParsedAccount[];
}

export interface ParseError {
	success: false;
	error: string;
}

export type UnifiedParseResponse = UnifiedParseResult | ParseError;

// 하위 호환: 기존 거래 전용 타입
export interface ParseResult {
	success: true;
	transactions: ParsedTransaction[];
}

export type ParseResponse = ParseResult | ParseError;
