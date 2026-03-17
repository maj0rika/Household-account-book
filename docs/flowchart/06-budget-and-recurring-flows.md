# 예산과 고정 거래 플로우

이 문서는 예산 CRUD와 고정 거래 규칙/적용 흐름을 정리한다.

## 차트 1. 예산 첫 접근

```mermaid
flowchart TD
	A["/budget 클릭"] --> B["BudgetPage"];
	B --> C["month 기본값 확정"];
	C --> D["getBudgetsWithSpent(month)"];
	C --> E["getUserCategories()"];
	D --> F["BudgetProgressList"];
	E --> G["BudgetForm"];
	F --> H["예산 액션 진입"];
	G --> H;
```

## 차트 2. 예산 관리

```mermaid
flowchart TD
	subgraph Budget["예산 관리"]
		B0["/budget<br/>BudgetPage"] --> B1["getBudgetsWithSpent(month)"];
		B0 --> B2["getUserCategories()"];
		B1 --> B3["budgets 조회 + 해당 월 expense 합계 병렬 조회"];
		B3 --> B4["categoryId별 spent 계산"];
		B4 --> B5["BudgetProgressList"];
		B2 --> B6["BudgetForm"];

		B6 --> B7["예산 추가"];
		B6 --> B8["예산 수정"];
		B6 --> B9["예산 삭제"];

		B7 --> B10["upsertBudget(categoryId, amount, month)"];
		B8 --> B10;
		B10 --> B11{"같은 user/category/month 예산 존재?"};
		B11 -->|예| B12["budgets update"];
		B11 -->|아니오| B13["budgets insert"];
		B12 --> B14["revalidateBudgetPages()"];
		B13 --> B14;

		B9 --> B15["deleteBudget(id)"];
		B15 --> B16["budgets delete"];
		B16 --> B14;
	end
```

## 차트 3. 고정 거래

```mermaid
flowchart TD
	subgraph Recurring["고정 거래"]
		R0["TransactionsPage 진입"] --> R1["autoApplyRecurringTransactions().catch()"];
		R1 --> R2["오늘 기준 due rule만 추림"];
		R2 --> R3["이번 달 기존 recurring transaction signature 조회"];
		R3 --> R4["없는 항목만 transactions insert"];

		R5["RecurringTransactionManager mount"] --> R6["getRecurringTransactions()"];
		R5 --> R7["getUserCategories()"];
		R5 --> R8["checkRecurringApplied(currentMonth)"];

		R9["고정 거래 추가"] --> R10["createRecurringTransaction()"];
		R10 --> R11["recurring_transactions insert"];
		R11 --> R12["revalidateRecurringPages()"];

		R13["고정 거래 삭제"] --> R14["deleteRecurringTransaction()"];
		R14 --> R15["recurring_transactions delete"];
		R15 --> R12;

		R16["이번 달 적용 버튼"] --> R17["applyRecurringTransactions(month)"];
		R17 --> R18["활성 rule 전체 조회"];
		R18 --> R19["월 말 보정 + 실제 거래 후보 생성"];
		R19 --> R20["이번 달 기존 recurring transaction과 signature 비교"];
		R20 --> R21["중복 제외 후 transactions insert"];
		R21 --> R22["count / alreadyApplied 계산"];
		R22 --> R12;
	end
```

## 관련 코드

- `src/app/(dashboard)/budget/page.tsx`;
- `src/components/budget/BudgetForm.tsx`;
- `src/components/budget/BudgetProgressList.tsx`;
- `src/server/actions/budget.ts`;
- `src/components/transaction/RecurringTransactionManager.tsx`;
- `src/server/actions/recurring.ts`;
- `src/app/(dashboard)/transactions/page.tsx`;
