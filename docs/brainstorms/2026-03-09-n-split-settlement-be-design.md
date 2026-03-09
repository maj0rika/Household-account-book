---
date: 2026-03-09
topic: n-split-settlement-be-design
phase: 14
---

# N분의 1 정산 기능 BE 설계

## 설계 목표

총무 결제의 `총액`이 개인 가계부 지출로 섞이지 않도록, **가계부 금액**, **실제 계좌 영향 금액**, **정산 추적 데이터**를 분리한다.

## 최우선 불변조건

1. `transactions.amount`는 언제나 개인 가계부 기준 금액이다
2. 총무 결제의 `총액`은 `transactions.amount`에 저장하지 않는다
3. 정산 회수는 기본적으로 `income transaction`으로 저장하지 않는다
4. 월 요약, 카테고리 통계, 예산, 거래 검색 합계는 `transactions.amount`만 사용한다
5. 계좌 잔액은 실제 돈의 이동을 반영하되, 그 결과가 가계부 통계에 섞이지 않아야 한다

## 현재 구조의 문제

현재 [schema.ts](/Users/leeth/Documents/git/Household%20account%20book/src/server/db/schema.ts)와 [transaction.ts](/Users/leeth/Documents/git/Household%20account%20book/src/server/actions/transaction.ts) 기준으로는 아래가 하나로 묶여 있다.

- 거래 리스트 금액
- 월 요약/차트/예산 금액
- 계좌 잔액 반영 금액

이 구조에서는 총무 결제 `총액`과 개인 소비 `내 부담금`을 동시에 표현할 수 없다.

## 권장 모델

### 1. 거래 금액과 계좌 영향 금액 분리

`transactions`에 아래 필드를 추가한다.

- `amount: integer`
  - 기존 의미 유지
  - 개인 가계부 기준 금액
- `accountImpactAmount: integer | null`
  - 실제 연결 계좌에서 빠져나가거나 들어온 금액
  - 일반 거래는 `null` 허용 후 액션에서 `amount`를 기본값으로 사용
  - 총무 결제는 `amount = 내 부담금`, `accountImpactAmount = 총액`
- `accountImpactDirection: "inflow" | "outflow" | null`
  - 필요 시 명시
  - 기존 `type`과 동일하게 계산 가능하면 생략 가능

이렇게 하면:

- 월 통계는 `amount`만 사용
- 계좌 잔액 반영은 `accountImpactAmount ?? amount` 사용

### 2. 정산 메타데이터는 별도 테이블

#### `settlements`

- `id`
- `userId`
- `transactionId`
- `title`
- `totalAmount`
- `myShareAmount`
- `participantCount`
- `role` (`organizer` | `participant`)
- `status` (`pending` | `partial` | `completed`)
- `sourceType` (`text` | `image` | `manual`)
- `sourceService` (`kakao` | `toss` | `unknown`)
- `createdAt`
- `updatedAt`

#### `settlementMembers`

- `id`
- `settlementId`
- `name`
- `shareAmount`
- `status` (`pending` | `partial` | `paid`)
- `paidAmount`
- `paidAt`
- `sortOrder`

### 3. 정산 회수/송금 기록은 거래와 분리

정산 회수를 `income transaction`으로 저장하면 가계부가 오염된다. 따라서 별도 이벤트 테이블을 둔다.

#### `settlementTransfers`

- `id`
- `settlementId`
- `memberId`
- `accountId`
- `direction` (`receive` | `send`)
- `amount`
- `occurredAt`
- `memo`
- `createdAt`

역할:

- 정산 회수/송금의 실제 계좌 이동 기록
- 계좌 잔액 반영 기준
- 가계부 통계에는 미포함

## 왜 `settlementTransfers`가 필요한가

`settlementMembers.paidAmount`만으로도 상태 관리는 가능하지만, 아래 문제가 남는다.

- 어느 계좌로 받았는지 기록이 약하다
- 부분 송금 이력이 남지 않는다
- 계좌 잔액 조정의 감사 추적이 어렵다

사용자가 강조한 핵심은 `가계부를 더럽히지 않는 것`이므로, 회수 이벤트를 별도로 남겨서 `수입 거래`를 만들지 않는 구조가 더 안전하다.

## 파싱 응답 모델 권장안

현재 [types.ts](/Users/leeth/Documents/git/Household%20account%20book/src/server/llm/types.ts)의 `ParsedTransaction[]`에 정산 필드를 계속 덧붙이면, 거래와 정산의 경계가 흐려진다.

권장안은 `거래 초안`과 `정산 초안`을 한 묶음으로 응답하는 새 타입이다.

```ts
interface ParsedSettlementMemberDraft {
	name: string;
	shareAmount: number;
	status?: "pending" | "paid";
}

interface ParsedSettlementDraft {
	role: "organizer" | "participant";
	totalAmount: number;
	myShareAmount: number;
	participantCount: number;
	sourceType: "text" | "image" | "manual";
	sourceService?: "kakao" | "toss" | "unknown";
	members?: ParsedSettlementMemberDraft[];
}

interface ParsedTransactionDraft {
	transaction: ParsedTransaction;
	settlement?: ParsedSettlementDraft | null;
}
```

핵심 규칙:

- `transaction.amount`는 항상 `내 부담금`
- `settlement.totalAmount`는 정산 전용 값

이렇게 분리해야 FE와 BE 양쪽에서 실수로 총액을 요약 통계에 넣는 일을 줄일 수 있다.

## 저장 액션 권장안

### 기존 액션 대체/확장

- `createTransactions(items, originalInput)` 대신 아래 형태 권장

```ts
createTransactionDrafts(
	drafts: ParsedTransactionDraft[],
	originalInput: string,
): Promise<{ success: boolean; count?: number; error?: string }>;
```

### 저장 규칙

1. 일반 거래
   - `transactions.amount = amount`
   - `accountImpactAmount = null`
2. 총무 정산 거래
   - `transactions.amount = myShareAmount`
   - `transactions.accountImpactAmount = totalAmount`
   - `settlements` 1건 생성
   - `settlementMembers` 여러 건 생성
3. 참여자 정산 거래
   - `transactions.amount = myShareAmount`
   - `transactions.accountImpactAmount = myShareAmount`
   - 필요 시 `settlements` 생성
4. 정산 회수 처리
   - `settlementTransfers` 생성
   - 연결 계좌 잔액 증가
   - `transactions`에는 새 수입 거래를 만들지 않음

## 계좌 잔액 반영 규칙

현재 [transaction.ts](/Users/leeth/Documents/git/Household%20account%20book/src/server/actions/transaction.ts)의 `adjustAccountBalance`는 `amount`를 그대로 사용한다.

Phase 14에서는 아래로 바뀌어야 한다.

- 거래 저장/수정/삭제 시 계좌 반영 금액 = `accountImpactAmount ?? amount`
- 정산 회수/송금 시 계좌 반영은 `settlementTransfers` 액션이 담당

## 조회 규칙

### 계속 `transactions.amount`만 사용하는 기능

- `getMonthlySummary`
- `getCategoryBreakdown`
- `getDailyExpenses`
- 거래 리스트 합계
- 예산 초과 계산

### 정산 전용 집계가 필요한 기능

- `getSettlementDigest`
- `getSettlements`
- `getSettlementByTransactionId`
- `getOutstandingReceivableTotal`

## 권장 Server Actions

- `createTransactionDrafts(drafts, originalInput)`
- `getSettlementDigest(month?)`
- `getSettlements(filters?)`
- `getSettlementDetail(settlementId)`
- `recordSettlementTransfer(memberId, payload)`
- `updateSettlementMemberStatus(memberId, payload)`

## 마이그레이션 우선순위

### 14A 최소 범위

1. `transactions.accountImpactAmount` 추가
2. `settlements` 추가
3. `settlementMembers` 추가

### 14A 안정화 권장 범위

4. `settlementTransfers` 추가

`settlementTransfers`를 빼고 출발할 수는 있지만, 계좌와 회수 이력을 깔끔하게 분리하려면 초기에 함께 넣는 편이 낫다.

## 금지 패턴

아래 구현은 사용자 요구를 직접 위반하므로 금지한다.

- 총무 결제 `총액`을 `transactions.amount`에 저장
- 친구가 보낸 정산금을 `income transaction`으로 저장
- 정산 총액을 월 요약/카테고리 차트에 합산
- 계좌 잔액 정합성을 맞추기 위해 가계부 거래를 임의 수입/지출로 추가 생성

## 결론

이 Phase의 BE 핵심은 `정산 기능 추가`가 아니라, **총무 결제가 개인 가계부 통계를 오염시키지 못하도록 데이터 경계를 강제하는 것**이다.

따라서 구현 순서는 아래가 맞다.

1. `amount`와 `accountImpactAmount` 경계 확정
2. `settlements`와 `settlementMembers` 저장 모델 확정
3. 정산 회수 이벤트를 `transaction` 밖으로 분리
4. 그 다음에 파싱/화면/대시보드 구현
