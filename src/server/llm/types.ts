export interface ParsedSettlementMember {
	name: string;
	shareAmount: number;
	status?: "pending" | "partial" | "paid";
	paidAmount?: number;
}

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
	accountImpactAmount?: number | null; // 실제 계좌 잔액에 반영할 금액 (총무 결제 총액 등)
	isSettlement?: boolean; // 정산 포함 거래 여부
	settlementRole?: "organizer" | "participant"; // 총무/참여자 역할
	settlementTotalAmount?: number | null; // 실제 총 결제 금액
	myShareAmount?: number | null; // 내가 부담하는 금액
	participantCount?: number | null; // 전체 참여 인원 수
	settlementStatus?: "pending" | "partial" | "completed"; // 정산 진행 상태
	settlementSourceType?: "text" | "image" | "manual"; // 정산 정보 출처
	settlementSourceService?: "kakao" | "toss" | "unknown"; // 정산 서비스
	settlementMembers?: ParsedSettlementMember[]; // 정산 상대 목록
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
