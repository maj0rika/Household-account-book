type SettlementSourceService = "kakao" | "toss" | "unknown";

type SettlementTransferOptionsFixture = {
	hasOpenSettlements: boolean;
};

type SettlementTransferHintExpectation = {
	direction: "receive" | "send";
	sourceService: SettlementSourceService;
	amount: number;
	counterpartyName?: string;
};

type SettlementImageHintExpectation = {
	role: "organizer" | "participant";
	sourceService: SettlementSourceService;
};

type SettlementTransferHintFixture = {
	title: string;
	input: string;
	options: SettlementTransferOptionsFixture;
	expected: SettlementTransferHintExpectation | null;
};

type SettlementTransferPreprocessFixture = {
	title: string;
	input: string;
	options: SettlementTransferOptionsFixture;
	expectedLines?: string[];
};

type SettlementImageHintFixture = {
	title: string;
	input: string;
	expected: SettlementImageHintExpectation | null;
};

type SettlementImagePreprocessFixture = {
	title: string;
	input: string;
	expectedLines?: string[];
};

// 정산 알림 회귀 케이스를 한 곳에서 관리한다.
export const settlementTransferHintFixtures: SettlementTransferHintFixture[] = [
	{
		title: "열린 정산이 있으면 서비스명이 없는 plain receive 알림도 이름 기준으로 허용한다",
		input: "김철수님이 15,000원 보냈어요",
		options: { hasOpenSettlements: true },
		expected: {
			direction: "receive",
			sourceService: "unknown",
			amount: 15000,
			counterpartyName: "김철수",
		},
	},
	{
		title: "열린 정산이 있으면 카카오페이 입금 알림에 receive 힌트를 붙인다",
		input: "카카오페이 김철수님이 15,000원 보냈어요",
		options: { hasOpenSettlements: true },
		expected: {
			direction: "receive",
			sourceService: "kakao",
			amount: 15000,
			counterpartyName: "김철수",
		},
	},
	{
		title: "열린 정산이 있으면 서비스명이 없는 plain send 알림도 이름 기준으로 허용한다",
		input: "민수에게 20,000원 보냈어요",
		options: { hasOpenSettlements: true },
		expected: {
			direction: "send",
			sourceService: "unknown",
			amount: 20000,
			counterpartyName: "민수",
		},
	},
	{
		title: "명시적 정산 키워드가 있으면 열린 정산이 없어도 힌트를 붙인다",
		input: "정산 18,000원 송금 완료",
		options: { hasOpenSettlements: false },
		expected: {
			direction: "send",
			sourceService: "unknown",
			amount: 18000,
			counterpartyName: undefined,
		},
	},
	{
		title: "열린 정산이 있으면 상대 이름이 있는 은행 입금 알림도 receive 힌트를 붙인다",
		input: "[카카오뱅크] 이영희님이 15,000원 입금했어요",
		options: { hasOpenSettlements: true },
		expected: {
			direction: "receive",
			sourceService: "unknown",
			amount: 15000,
			counterpartyName: "이영희",
		},
	},
];

export const settlementTransferPreprocessFixtures: SettlementTransferPreprocessFixture[] = [
	{
		title: "열린 정산이 있으면 토스 송금 완료 알림에 send 힌트를 붙인다",
		input: "토스 송금 완료 20,000원 받는 분 민수",
		options: { hasOpenSettlements: true },
		expectedLines: [
			"[정산 이력 힌트]",
			"- direction: send",
			"- sourceService: toss",
			"- amount: 20000",
			"- counterpartyName: 민수",
		],
	},
	{
		title: "열린 정산이 없고 명시적 정산 키워드도 없으면 일반 송금 알림은 그대로 둔다",
		input: "카카오페이 송금 완료 12,000원 받는 분 민수",
		options: { hasOpenSettlements: false },
	},
	{
		title: "열린 정산이 있어도 상대 이름이 없는 일반 입금 알림은 정산으로 오인하지 않는다",
		input: "[카카오뱅크] 급여 3,000,000원 입금",
		options: { hasOpenSettlements: true },
	},
	{
		title: "열린 정산이 있어도 상대 이름이 없는 일반 송금 완료 알림은 정산으로 오인하지 않는다",
		input: "이체 완료 50,000원",
		options: { hasOpenSettlements: true },
	},
];

export const settlementImageHintFixtures: SettlementImageHintFixture[] = [
	{
		title: "카카오 정산 OCR 문구에서 participant 이미지 힌트를 만든다",
		input: "카카오톡 정산 보낼 금액 15,000원 송금하기",
		expected: {
			role: "participant",
			sourceService: "kakao",
		},
	},
];

export const settlementImagePreprocessFixtures: SettlementImagePreprocessFixture[] = [
	{
		title: "토스 정산 OCR 문구에서 organizer 이미지 힌트를 만든다",
		input: "토스 정산 요청 받을 금액 42,000원 미입금 2명",
		expectedLines: [
			"[이미지 정산 힌트]",
			"- settlementRole: organizer",
			"- settlementSourceService: toss",
		],
	},
	{
		title: "일반 영수증 보조 텍스트에는 이미지 정산 힌트를 붙이지 않는다",
		input: "스타벅스 아메리카노 4,500원 결제",
	},
];
