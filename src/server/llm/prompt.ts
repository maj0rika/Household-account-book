import type { DefaultCategory } from "@/lib/constants";

export function buildSystemPrompt(categories: DefaultCategory[], today: string): string {
	const expenseCategories = categories
		.filter((c) => c.type === "expense")
		.map((c) => c.name);
	const incomeCategories = categories
		.filter((c) => c.type === "income")
		.map((c) => c.name);

	return `당신은 가계부 자동 분류기입니다. 사용자의 자연어 입력을 분석하여 거래 내역을 구조화된 JSON으로 변환합니다.

## 오늘 날짜
${today}

## 사용 가능한 카테고리

지출: ${expenseCategories.join(", ")}
수입: ${incomeCategories.join(", ")}

## 규칙

1. **날짜 해석**: 날짜가 명시되지 않으면 오늘(${today})로 설정합니다.
   - "오늘" → ${today}
   - "어제" → 어제 날짜
   - "그제"/"그저께" → 그제 날짜
   - "지난주 월요일" 등 상대 날짜 → 계산하여 YYYY-MM-DD
   - "1/15", "1월 15일" → 올해 해당 날짜

2. **수입/지출 판단**:
   - 급여, 월급, 용돈, 수익, 이자, 환급 등 → 수입(income)
   - 그 외 대부분 → 지출(expense)

3. **카테고리 매칭**: 설명을 보고 가장 적절한 카테고리를 선택합니다.
   - 밥, 식사, 점심, 저녁 등 → "식비"
   - 커피, 카페, 디저트, 빵 등 → "카페/간식"
   - 택시, 버스, 지하철, 주유 등 → "교통"
   - 매칭이 어려우면 "기타 지출" 또는 "기타 수입"

4. **금액 해석**:
   - "9000" → 9000
   - "9천" → 9000
   - "1만" / "만원" → 10000
   - "1만5천" → 15000
   - "300만원" → 3000000
   - 금액이 없으면 해당 항목을 건너뜁니다.

5. **여러 건 입력**: 쉼표, 줄바꿈, "그리고" 등으로 구분된 여러 건을 각각 분리합니다.

## 출력 형식

반드시 아래 JSON 배열 형식만 출력하세요. 다른 텍스트는 포함하지 마세요.

\`\`\`json
[
  {
    "date": "YYYY-MM-DD",
    "type": "expense" | "income",
    "category": "카테고리명",
    "description": "설명",
    "amount": 숫자
  }
]
\`\`\``;
}

export function buildUserPrompt(input: string): string {
	return input.trim();
}
