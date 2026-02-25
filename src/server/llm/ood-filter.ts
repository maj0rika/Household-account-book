// 가계부 관련 키워드 — 이 중 하나라도 포함되면 In-Domain
const FINANCIAL_KEYWORDS = [
	// 금액 단위 (단독 사용 시)
	"만원", "천원", "백만원",
	// 거래 행위
	"결제", "승인", "출금", "입금", "이체", "송금", "환불", "취소",
	"구매", "구입", "샀", "샀다", "지불", "납부", "충전",
	// 수입/지출 용어
	"월급", "급여", "용돈", "보너스", "상여", "수입", "지출",
	"매출", "수익", "이자", "배당", "환급", "정산",
	// 카테고리 관련
	"식비", "교통", "카페", "간식", "쇼핑", "통신", "관리비",
	"보험", "의료", "교육", "문화", "여행", "구독", "배달",
	// 자산/부채
	"잔액", "잔고", "대출", "적금", "예금", "투자", "주식",
	"펀드", "부채", "미결제", "카드값", "할부",
	// 은행/카드
	"은행", "카드", "카카오뱅크", "토스", "신한", "국민", "우리",
	"하나", "농협", "기업", "SC", "씨티",
	// 고정 거래
	"고정", "매달", "매월", "구독료", "월세",
	// 가계부 기능
	"가계부", "내역", "영수증",
];

// 금액 패턴 정규식 (숫자 + 원/만원/천원 등)
const AMOUNT_PATTERN = /\d+[\s,]*(원|만\s*원|천\s*원|백만|만|천)/;
// 순수 숫자 금액 패턴 (4자리 이상 — 1000원 이상의 금액)
const NUMERIC_AMOUNT_PATTERN = /\d{4,}/;
// 은행 알림 메시지 패턴
const BANK_MESSAGE_PATTERN = /\[.+\]\s*(출금|입금|결제|승인|이체)/;

/**
 * 입력이 가계부 도메인과 관련 있는지 판별
 * @returns true면 In-Domain (통과), false면 OOD (차단)
 */
export function isFinancialInput(input: string): boolean {
	const normalized = input.trim().toLowerCase();

	// 빈 입력은 다른 곳에서 처리
	if (!normalized) return true;

	// 은행 알림 메시지 패턴 → 무조건 통과
	if (BANK_MESSAGE_PATTERN.test(normalized)) return true;

	// 금액 패턴 포함 → 통과
	if (AMOUNT_PATTERN.test(normalized)) return true;

	// 4자리 이상 숫자 포함 → 통과 (예: "스타벅스 4500")
	if (NUMERIC_AMOUNT_PATTERN.test(normalized)) return true;

	// 가계부 키워드 포함 → 통과
	for (const keyword of FINANCIAL_KEYWORDS) {
		if (normalized.includes(keyword.toLowerCase())) return true;
	}

	return false;
}

export const OOD_ERROR_MESSAGE = "가계부와 관련된 내용을 입력해 주세요.\n예: 점심 김치찌개 9000, 카카오뱅크 잔액 150만원";
