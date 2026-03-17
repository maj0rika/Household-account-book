# 날짜 이동, 필터링, 통계 드릴다운

이 문서는 날짜 이동, 거래 필터링, 통계 드릴다운을 중간 밀도 차트로 정리한다.

## 차트 1. 거래 내역·통계 첫 접근

```mermaid
flowchart TD
	A["사이드 메뉴 클릭"] --> B{"거래 내역 / 통계"};

	B -->|거래 내역| C["TransactionsPage"];
	C --> D["month 기본값 확정"];
	D --> E["autoApplyRecurringTransactions() fire-and-forget"];
	E --> F["요약 / 달력 / 인사이트 조회"];
	F --> G["MonthNavigator + TransactionsLazySections"];

	B -->|통계| H["StatisticsPage"];
	H --> I["month / category 기본값 확정"];
	I --> J["getMonthlySummary + getMonthlyTrend + getCategoryRanking"];
	J --> K["MonthNavigator + StatisticsLazySections"];
```

## 차트 2. 월 이동과 날짜 선택

```mermaid
flowchart TD
	A["MonthNavigator 클릭"] --> B["이전 / 다음 / 월 점프"];
	B --> C["pushWithMonth()"];
	C --> D["searchParams 갱신"];
	D --> E["month 설정 또는 제거"];
	E --> F["focusDate 제거"];
	F --> G["router.push()"];
	G --> H["서버 페이지 재실행"];
	H --> I["월 기준 데이터 재조회"];
	I --> J["달력 날짜 클릭"];
	J --> K["selectedDate 설정"];
	K --> L["DayTransactionSheet"];
	L --> M["거래 클릭"];
	M --> N["TransactionEditSheet"];
	N --> O["update/deleteTransaction()"];
	O --> P["거래 갱신 + 잔액 조정 + 캐시 무효화"];
```

## 차트 3. 거래 필터링과 통계 드릴다운

```mermaid
flowchart TD
	A["FilterableTransactionList"] --> B["월 거래 배열 수신"];
	B --> C["로컬 filters state"];
	C --> D["검색어 / 유형 / 카테고리"];
	D --> E["applyFilters()"];
	E --> F["filteredTransactions 계산"];
	F --> G["TransactionList 재렌더"];

	H["CategoryPieChart 클릭"] --> I["/statistics?month=...&category=..."];
	I --> J["StatisticsPage 재실행"];
	J --> K["요약 + 추이 + 랭킹 조회"];
	K --> L["CategoryRankingList"];
	L --> M["selectedCategoryId 클라이언트 필터"];
	M --> N["전체 보기"];
	N --> O["category searchParam 제거"];
```

## 현재 구현 특징

- 거래내역 필터는 서버 재조회가 아니라, 이미 불러온 해당 월 거래 배열에 대한 클라이언트 필터다;
- 월 이동은 `searchParams` 기반이라 새 서버 렌더를 유도한다;
- 통계 카테고리 상세는 서버에서 월 데이터는 다시 받고, 선택 카테고리 좁히기는 클라이언트에서 수행한다;

## 관련 코드

- `src/components/dashboard/MonthNavigator.tsx`;
- `src/app/(dashboard)/transactions/page.tsx`;
- `src/app/(dashboard)/statistics/page.tsx`;
- `src/app/(dashboard)/budget/page.tsx`;
- `src/components/dashboard/InteractiveCalendar.tsx`;
- `src/components/dashboard/CalendarView.tsx`;
- `src/components/dashboard/DayTransactionSheet.tsx`;
- `src/components/transaction/FilterableTransactionList.tsx`;
- `src/components/transaction/TransactionList.tsx`;
- `src/components/dashboard/CategoryPieChart.tsx`;
- `src/components/statistics/CategoryRankingList.tsx`;
