# 거래 입력과 파싱

이 문서는 수동 입력, 자연어/이미지 파싱, 파싱 결과 검수, 혼합 입력 분기를 중간 밀도 흐름으로 정리한다.

## 차트 1. 직접 입력 첫 접근

```mermaid
flowchart TD
	A["사이드바 / 하단 입력 클릭"] --> B["useManualInput.open()"];
	B --> C["GlobalManualInputDialog open"];
	C --> D["DashboardLayout에서 initialCategories + initialAccounts 준비 완료"];
	D --> E["UnifiedInputSection"];
	E --> F{"직접 입력 / 자연어·이미지"};
	F -->|직접 입력| G["ManualInputDialog 기본값 표시"];
	F -->|자연어·이미지| H["NaturalInputBar 대기"];
```

## 차트 2. 입력에서 결과 시트까지

```mermaid
flowchart TD
	A["입력 시작"] --> B{"직접 입력 / 자연어·이미지"};
	B -->|직접 입력| C["ManualInputDialog"];
	B -->|자연어·이미지| D["NaturalInputBar"];

	C --> E["categories + accounts 조회"];
	E --> F["사용자 값 입력"];
	F --> G["createSingleTransaction()"];
	G --> H["transactions 저장 + 필요 시 계좌 잔액 반영"];
	H --> I["transaction 캐시 무효화"];

	D --> J{"텍스트 / 이미지"};
	J -->|텍스트| K["입력 저장"];
	J -->|이미지| L["파일 검증 + 압축"];
	K --> M["/api/parse"];
	L --> M;
	M --> N["origin + 세션 + rate limit 검사"];
	N --> O["text/image parse 실행"];
	O --> P["provider 선택 + categories/accounts 조회"];
	P --> Q["LLM 파싱"];
	Q --> R["UnifiedParseResponse"];
	R --> S["UnifiedInputSection.handleParsed()"];
	S --> T{"거래 있음?"};
	S --> U{"자산 있음?"};
	T -->|예| V["ParseResultSheet"];
	U -->|예| W["AccountParseResultSheet 또는 defer"];
```

## 차트 3. 파싱 결과 검수와 저장

```mermaid
flowchart TD
	A["ParseResultSheet"] --> B["항목 수정"];
	B --> C{"suggestedCategory 있음?"};
	C -->|예| D["addCategory()"];
	D --> E["로컬 category / item 동기화"];
	C -->|아니오| F["바로 저장 가능"];
	E --> F;

	F --> G["createTransactions()"];
	G --> H["누락 카테고리 자동 생성"];
	H --> I["DB 트랜잭션"];
	I --> J["일반 거래 저장"];
	I --> K["고정 거래 규칙 저장"];
	J --> L["계좌 잔액 반영"];
	K --> M["이번 달 recurring 거래 생성"];
	L --> N["transaction 캐시 무효화"];
	M --> N;
	N --> O{"혼합 입력?"};
	O -->|아니오| P["/transactions?saved=tx&focus=list"];
	O -->|예| Q["거래 시트 닫힘"];
	Q --> R["accounts + categories 재조회"];
	R --> S["AccountParseResultSheet 열기"];
```

## 관련 코드

- `src/app/(dashboard)/layout.tsx`;
- `src/components/providers/ManualInputProvider.tsx`;
- `src/components/providers/GlobalManualInputDialog.tsx`;
- `src/components/transaction/ManualInputDialog.tsx`;
- `src/components/transaction/NaturalInputBar.tsx`;
- `src/components/transaction/ParseResultSheet.tsx`;
- `src/components/transaction/UnifiedInputSection.tsx`;
- `src/app/api/parse/route.ts`;
- `src/server/services/parse-core.ts`;
- `src/server/actions/transaction.ts`;
- `src/server/actions/settings.ts`;
