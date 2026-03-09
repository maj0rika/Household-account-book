// 가계부 관련 단서 — 하나라도 포함되면 바로 통과
const FINANCIAL_HINTS = [
	// 금액 단위 (단독 사용 시)
	"만원", "천원", "백만원",
	// 거래 행위
	"결제", "승인", "출금", "입금", "이체", "송금", "환불", "취소",
	"구매", "구입", "샀", "샀다", "지불", "납부", "충전", "인출",
	"자동이체", "정기결제", "상환", "매수", "매도", "반품",
	// 수입/지출 용어
	"월급", "급여", "용돈", "보너스", "상여", "수입", "지출",
	"매출", "수익", "이자", "배당", "배당금", "환급", "정산",
	"캐시백", "페이백", "보험금", "지원금", "장학금", "부업",
	"프리랜서", "알바비", "판매", "중고판매", "당근",
	// 카테고리 관련
	"식비", "교통", "카페", "간식", "쇼핑", "통신", "관리비",
	"보험", "보험료", "의료", "병원", "약국", "교육", "문화", "여행",
	"구독", "구독료", "배달", "월세", "공과금", "세금", "주유",
	"주차", "지하철", "버스", "택시", "마트", "편의점", "생필품",
	"생활비", "미용", "네일", "옷", "선물", "축의금", "부의금",
	// 자산/부채
	"잔액", "잔고", "대출", "적금", "예금", "투자", "주식",
	"펀드", "증권", "예수금", "부채", "미결제", "카드값", "카드대금",
	"할부", "채무", "현금서비스", "카드론", "마이너스통장",
	// 은행/카드
	"은행", "카드", "카카오뱅크", "토스", "신한", "국민", "우리",
	"하나", "농협", "기업", "SC", "씨티",
	// 고정 거래
	"고정", "매달", "매월", "월간", "월세",
	// 가계부 기능
	"가계부", "내역", "영수증",
];

// 명백한 비도메인 입력만 선차단하고, 애매한 입력은 LLM 2차 필터에 맡긴다.
const OBVIOUS_OOD_PATTERNS = [
	/날씨|기온|미세먼지|비\s*와|눈\s*와/,
	/자바스크립트|typescript|python|react|next\.?js|코드|프로그래밍|알고리즘|sql/,
	/번역|통역|요약|맞춤법|교정|이메일\s*써|블로그\s*써|자소서\s*써/,
	/농담|웃긴\s*얘기|재미있는\s*얘기|사랑해|심심해|뭐해/,
];

const SHORT_CASUAL_INPUTS = new Set([
	"안녕",
	"하이",
	"ㅎㅇ",
	"hello",
	"hi",
	"고마워",
	"감사",
	"감사해",
	"잘자",
	"굿모닝",
	"굿나잇",
]);

// 금액 패턴 정규식 (숫자 + 원/만원/천원 등)
const AMOUNT_PATTERN = /\d+[\s,]*(원|만\s*원|천\s*원|백만|만|천)/;
// 순수 숫자 금액 패턴 (4자리 이상 — 1000원 이상의 금액)
const NUMERIC_AMOUNT_PATTERN = /\d{4,}/;
// 은행 알림 메시지 패턴
const BANK_MESSAGE_PATTERN = /\[.+\]\s*(출금|입금|결제|승인|이체)/;

function hasFinancialHint(normalized: string): boolean {
	if (BANK_MESSAGE_PATTERN.test(normalized)) return true;
	if (AMOUNT_PATTERN.test(normalized)) return true;
	if (NUMERIC_AMOUNT_PATTERN.test(normalized)) return true;

	for (const hint of FINANCIAL_HINTS) {
		if (normalized.includes(hint.toLowerCase())) return true;
	}

	return false;
}

function isObviouslyOOD(normalized: string): boolean {
	if (SHORT_CASUAL_INPUTS.has(normalized)) {
		return true;
	}

	return OBVIOUS_OOD_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * 입력이 가계부 도메인과 관련 있는지 판별
 * false negative를 줄이기 위해, 명백한 비도메인 입력만 선차단한다.
 * @returns true면 In-Domain (통과), false면 OOD (차단)
 */
export function isFinancialInput(input: string): boolean {
	const normalized = input.trim().toLowerCase();

	// 빈 입력은 다른 곳에서 처리
	if (!normalized) return true;

	// 금융 단서가 보이면 바로 통과
	if (hasFinancialHint(normalized)) {
		return true;
	}

	// 명백한 비도메인 입력만 차단하고, 애매한 입력은 LLM 2차 필터로 보낸다.
	return !isObviouslyOOD(normalized);
}

export const OOD_ERROR_MESSAGE = "거래나 자산과 관련된 문장을 입력해 주세요.\n예: 점심 김치찌개 9000, 환불 23000원 들어옴, 카카오뱅크 잔액 150만원";
