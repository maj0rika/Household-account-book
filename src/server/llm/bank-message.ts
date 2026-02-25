/**
 * 은행/카드 알림 메시지 전처리
 *
 * 붙여넣기된 은행 알림 메시지에서 노이즈를 제거하고
 * LLM이 파싱하기 쉬운 형태로 정규화합니다.
 */

// 잔액/한도/누적 관련 노이즈 패턴
const NOISE_PATTERNS = [
	/잔액\s*[:\s]?\s*[\d,]+원?/g,
	/누적\s*[:\s]?\s*[\d,]+원?/g,
	/남은\s*한도\s*[:\s]?\s*[\d,]+원?/g,
	/한도\s*[:\s]?\s*[\d,]+원?/g,
	/총\s*잔액\s*[:\s]?\s*[\d,]+원?/g,
	/일시불/g,
	/할부\s*\d+개?월?/g,
];

/**
 * 은행 알림 메시지인지 판별합니다.
 */
export function isBankMessage(input: string): boolean {
	const bankKeywords = [
		// 은행
		"카카오뱅크", "국민", "신한", "우리", "하나", "농협", "기업", "SC제일", "토스뱅크",
		// 카드
		"신한카드", "삼성카드", "현대카드", "KB카드", "국민카드", "하나카드", "우리카드",
		"롯데카드", "NH카드", "비씨카드", "토스",
		// 키워드
		"승인", "출금", "입금", "결제",
	];

	const lines = input.split("\n").filter((l) => l.trim());
	if (lines.length === 0) return false;

	// 여러 줄 중 하나라도 은행 키워드가 있으면 은행 메시지로 판단
	return lines.some((line) =>
		bankKeywords.some((keyword) => line.includes(keyword))
	);
}

/**
 * 은행 알림 메시지에서 노이즈를 제거합니다.
 */
export function preprocessBankMessage(input: string): string {
	let text = input;

	// 노이즈 패턴 제거
	for (const pattern of NOISE_PATTERNS) {
		text = text.replace(pattern, "");
	}

	// 빈 줄 정리 & 연속 공백 정리
	const lines = text
		.split("\n")
		.map((line) => line.replace(/\s+/g, " ").trim())
		.filter((line) => line.length > 0);

	return lines.join("\n");
}
