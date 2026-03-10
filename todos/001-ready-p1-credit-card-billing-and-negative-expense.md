---
status: ready
priority: p1
issue_id: "001"
tags: [transactions, accounts, debt, "credit-card", adjustments]
dependencies: []
---

# 카드 결제일 반영 + 음수 지출(지출 차감) 도메인 확장

카드를 단순 부채 계정 목록에만 두는 수준을 넘어서, `사용일`, `청구기간`, `결제일`, `실제 출금일`을 분리해 다뤄야 한다. 또한 정산금, 일부 환급, 공동지출 회수처럼 지출을 줄여야 하는 금액은 `수입`이 아니라 `지출 차감`으로 기록할 수 있어야 한다.

## 문제 설명

- 현재 `credit_card`는 `accounts.subType`으로만 존재하고, 카드 사용 시 부채 증가와 결제일의 자산 감소를 분리하는 규칙이 없다.
- 카드사마다 결제일과 이용대금 반영 기간이 다른데, 현재 모델에는 청구 주기 계산 규칙을 저장할 곳이 없다.
- `지출`은 사실상 양수 전제로 흘러가고 있어서, 나중에 누군가 보낸 정산금이나 일부 환급을 입력하면 `수입`으로 잘못 잡히기 쉽다.
- 사용자가 원하는 것은 “돈이 들어왔다”가 아니라 “내 최종 지출이 줄었다”는 기록이다.
- 예시: 내가 비행기값 `800000원`을 카드로 먼저 결제하고, 이후 태희가 `400000원`을 보내주면 월 수입이 늘어나는 것이 아니라 여행 지출이 `400000원` 줄어들어야 한다.

## 발견 사항

- [src/server/db/schema.ts](/Users/leeth/Documents/git/Household%20account%20book/src/server/db/schema.ts)에는 `transactions.amount`와 별도로 `accountImpactAmount`가 이미 있어, 가계부 금액과 실제 계좌 반영 금액을 분리할 기반은 있다.
- [src/server/settlement/utils.ts](/Users/leeth/Documents/git/Household%20account%20book/src/server/settlement/utils.ts)의 `resolveAccountImpactAmount()`는 정산 총무 케이스에서 이미 `거래 금액`과 `실제 계좌 영향 금액`을 다르게 다루고 있다.
- [src/server/account-balance.ts](/Users/leeth/Documents/git/Household%20account%20book/src/server/account-balance.ts)는 자산/부채 구분 없이 `income => +`, `expense => -`만 적용하므로, 카드 사용 시 부채 잔액이 늘어야 하는 시나리오를 정확히 표현하지 못한다.
- [docs/brainstorms/2026-03-09-n-split-settlement-planning.md](/Users/leeth/Documents/git/Household%20account%20book/docs/brainstorms/2026-03-09-n-split-settlement-planning.md)는 “정산금은 수입으로 잡지 않는다”는 원칙을 이미 세웠다. 음수 지출은 같은 원칙을 일반 거래에도 확장하는 작업이다.
- [docs/roadmap-v2-todo-phase-plan.md](/Users/leeth/Documents/git/Household%20account%20book/docs/roadmap-v2-todo-phase-plan.md)와 [docs/implementation-plan.md](/Users/leeth/Documents/git/Household%20account%20book/docs/implementation-plan.md)에는 카드 청구주기와 지출 차감에 대한 후속 항목이 아직 없다.

## 제안 해결책

### 옵션 1. 카드 청구서 레이어 + 음수 지출 허용

**접근 방식:**
카드 계정에 결제일/청구기간 규칙을 저장하고, 카드 사용 거래는 `지출`로 즉시 기록하되 실제 현금성 자산 차감은 결제일에 별도 반영한다. 동시에 `type = "expense"`에서 `amount < 0`을 허용해 지출 차감 입력을 지원한다.

**장점:**
- 사용일 기준 지출 통계와 결제일 기준 현금흐름을 동시에 맞출 수 있다.
- 카드사별 결제주기 차이를 카드 계정 설정으로 흡수할 수 있다.
- 정산금, 환급, 공동지출 회수, 일부 캐시백을 `수입`으로 오염시키지 않는다.
- 기존 `accountImpactAmount` 개념을 확장하는 방향이라 현재 구조와 가장 잘 맞는다.

**단점:**
- 카드 청구기간 계산, 결제 적용, 통계 집계 보정까지 백엔드 범위가 넓다.
- 차트/카테고리 집계에서 음수 지출이 단독으로 존재할 때의 표시 정책을 정해야 한다.

**노력:** 3~5일

**리스크:** 중간

---

### 옵션 2. 카드 결제만 별도 거래로 생성하고 지출은 양수만 유지

**접근 방식:**
카드 사용은 기존처럼 지출로 저장하고, 결제일에 카드값 지출 또는 계좌이체성 거래를 추가 생성한다. 지출 차감은 `수입`이지만 별도 플래그를 붙여 리포트에서 제외한다.

**장점:**
- 초기 구현이 상대적으로 빠르다.
- 스키마 변경을 최소화할 수 있다.

**단점:**
- 카드 사용일과 결제일이 모두 지출로 보일 위험이 있어 이중 집계 방지가 어렵다.
- “지출 차감이지 수입이 아니다”라는 사용자 요구를 우회만 하고 해결하지 못한다.
- 카드사별 청구기간을 정확히 다루기 어렵다.

**노력:** 1~2일

**리스크:** 높음

---

### 옵션 3. 카드/정산/회수를 모두 기존 정산 레이어로 통합

**접근 방식:**
카드 결제와 공동지출 회수를 모두 `settlements` 또는 `settlement_transfers` 성격으로 해석해 처리한다.

**장점:**
- 일부 전송/회수 로직을 재사용할 수 있다.

**단점:**
- 카드 청구는 대인 정산이 아니라 카드사 부채 관리이므로 도메인이 맞지 않는다.
- 카드 단독 사용, 할부, 청구주기 계산을 정산 UX로 설명하기 어렵다.
- 일반 지출 차감까지 정산 UI로 끌어오면 사용자 정신 모델이 깨진다.

**노력:** 2~4일

**리스크:** 높음

## 권장 조치

옵션 1을 기준으로 진행한다. 카드 사용과 결제, 그리고 지출 차감을 모두 “가계부 금액”, “부채 잔액”, “실제 자산 출금”의 세 축으로 분리해서 정의해야 한다.

### Phase 1. PM

- 카드 관련 불변조건을 문서화한다.
- `카드 사용일의 지출 통계 반영`과 `결제일의 자산 출금 반영`을 별개 사건으로 정의한다.
- `지출 -금액`은 수입이 아니라 `지출 차감`으로 정의하고, 예산/카테고리/월합계에서 순지출로 반영한다고 확정한다.
- 카드 결제 이벤트는 월 지출에 다시 합산하지 않는다고 확정한다.
- 원거래 연결이 없는 독립 음수 지출도 허용할지 결정한다.
추천: 1차는 독립 입력 허용, 2차에서 원거래 링크를 선택적으로 추가한다.

### Phase 2. UX/UI

- [src/components/assets/AccountFormSheet.tsx](/Users/leeth/Documents/git/Household%20account%20book/src/components/assets/AccountFormSheet.tsx)에 `결제일`, `이용기간 기준일`, `다음 결제 예정 미리보기`를 추가한다.
- 카드 계정 상세/목록에서 `이번 결제 예정`, `다음 결제일`, `이번 달 사용액`을 보여주는 카드 UI를 정의한다.
- [src/components/transaction/ManualInputDialog.tsx](/Users/leeth/Documents/git/Household%20account%20book/src/components/transaction/ManualInputDialog.tsx), [src/components/transaction/ParseResultSheet.tsx](/Users/leeth/Documents/git/Household%20account%20book/src/components/transaction/ParseResultSheet.tsx), [src/components/transaction/TransactionEditSheet.tsx](/Users/leeth/Documents/git/Household%20account%20book/src/components/transaction/TransactionEditSheet.tsx)에서 `-400000` 입력이 가능하도록 하고, 라벨을 `음수 지출`, `지출 차감`, `환급/정산 회수`처럼 오해 없는 문구로 정리한다.
- 카드 사용 거래를 선택했을 때 “가계부 지출은 오늘 반영되고, 실제 출금은 결제일에 처리됩니다.” 보조 문구를 노출한다.
- 음수 지출 거래 아이템은 일반 수입과 구분되는 배지 또는 서브라벨을 둔다.

### Phase 3. BE

- [src/server/db/schema.ts](/Users/leeth/Documents/git/Household%20account%20book/src/server/db/schema.ts)에 카드 결제주기 설정 컬럼 또는 전용 테이블을 추가한다.
추천 후보: `statementClosingDay`, `paymentDay`, `statementWindowMode`, `paymentAssetAccountId`.
- 카드 결제 이벤트 저장용 테이블을 추가하거나, 자산↔부채 이동을 표현하는 전용 transfer 액션을 설계한다.
- [src/server/account-balance.ts](/Users/leeth/Documents/git/Household%20account%20book/src/server/account-balance.ts)의 잔액 증감 방향을 `account.type`과 `account.subType` 기준으로 분기한다.
핵심 규칙: 자산 계정의 지출은 감소, 카드 부채 계정의 지출은 증가, 결제 이벤트는 자산 감소 + 카드 부채 감소.
- [src/server/actions/transaction.ts](/Users/leeth/Documents/git/Household%20account%20book/src/server/actions/transaction.ts)에서 `expense` 음수 금액을 허용하고, 생성/수정/삭제 시 집계와 계좌 반영이 역전 없이 동작하게 만든다.
- 월 요약, 예산, 카테고리 차트, 캘린더 집계 쿼리에 signed expense를 반영한다.
- 카드 청구기간 계산 유틸을 별도로 두고, 결제일이 달라도 거래가 어느 명세서에 묶이는지 판정 가능하게 만든다.

### Phase 4. FE

- `/assets`와 관련 컴포넌트에서 카드 부채를 일반 대출과 구분해 보여준다.
- 거래 목록/상세에서 카드 사용 거래와 카드 결제 이벤트를 다른 언어로 표시한다.
예: `카드 사용`, `카드 결제`, `지출 차감`.
- 파싱 결과 편집에서 “태희가 40만원 보내줌” 같은 입력을 `수입`이 아니라 `지출 -400000원` 초안으로 빠르게 바꿀 수 있게 한다.
- 카드별 결제 예정 금액에 포함된 거래 리스트를 확인할 수 있는 상세 UI를 마련한다.

### Phase 5. Infra / QA

- 카드 청구기간 계산 유틸에 날짜 경계 테스트를 추가한다.
- 계좌 반영 테스트에서 `asset`, `loan`, `credit_card`의 방향 차이를 검증한다.
- 음수 지출이 있는 달에도 월 요약, 예산, 차트, 캘린더, 정산 보드가 깨지지 않는지 회귀 테스트를 추가한다.
- 대표 수동 QA 시나리오를 고정한다.
시나리오 1: 3월 9일 카드 결제, 4월 14일 출금.
시나리오 2: 80만원 지출 후 40만원 음수 지출 입력.
시나리오 3: 카드사별 서로 다른 결제일/이용기간.

## 기술 세부사항

**영향받는 파일 후보:**
- `src/server/db/schema.ts`
- `src/server/account-balance.ts`
- `src/server/actions/transaction.ts`
- `src/server/actions/account.ts`
- `src/server/actions/statistics.ts`
- `src/types/index.ts`
- `src/components/assets/AccountFormSheet.tsx`
- `src/components/assets/AccountList.tsx`
- `src/components/assets/NetWorthCard.tsx`
- `src/components/transaction/ManualInputDialog.tsx`
- `src/components/transaction/ParseResultSheet.tsx`
- `src/components/transaction/TransactionEditSheet.tsx`
- `src/components/transaction/TransactionItemContent.tsx`

**도메인 규칙 초안:**
- `transactions.amount`는 signed integer를 허용한다. 단, `type = "expense"`인 음수는 지출 차감 의미로만 사용한다.
- 카드 사용 거래는 `expense`로 즉시 저장하되, 자산 계좌가 아니라 카드 부채 계정에 우선 반영한다.
- 카드 결제일 이벤트는 `expense`가 아니라 자산↔부채 이동 이벤트로 처리한다.
- 월 지출 통계는 `expense` 타입 합계의 signed sum을 사용한다.
- 카드 결제 이벤트와 정산 transfer는 월 수입/지출 통계에서 제외한다.

**리스크 메모:**
- 음수 지출만 단독으로 있는 카테고리는 차트 라이브러리에서 음수 값 렌더링 정책을 따로 정해야 한다.
- 카드 결제일이 1~31일 고정이 아닌 카드사 정책이 있을 수 있어, 1차는 “월 기준 일자 + 전월/당월 경계 규칙”으로 제한하는 편이 안전하다.

## 참고 자료

- [docs/implementation-plan.md](/Users/leeth/Documents/git/Household%20account%20book/docs/implementation-plan.md)
- [docs/roadmap-v2-todo-phase-plan.md](/Users/leeth/Documents/git/Household%20account%20book/docs/roadmap-v2-todo-phase-plan.md)
- [docs/brainstorms/2026-03-09-n-split-settlement-planning.md](/Users/leeth/Documents/git/Household%20account%20book/docs/brainstorms/2026-03-09-n-split-settlement-planning.md)
- [docs/history/2026-02-26-07-asset-transaction-linking.md](/Users/leeth/Documents/git/Household%20account%20book/docs/history/2026-02-26-07-asset-transaction-linking.md)

## 수용 기준

- [ ] 카드 계정별로 결제일과 청구기간 규칙을 저장할 수 있다.
- [ ] 카드 사용 거래를 저장하면 지출 통계는 사용일 기준으로 반영되고, 카드 부채 잔액은 즉시 증가한다.
- [ ] 카드 결제일 처리 시 자산 잔액은 감소하고 카드 부채 잔액은 감소하며, 월 지출에는 이중 반영되지 않는다.
- [ ] 서로 다른 결제일을 가진 두 카드가 같은 달에 사용돼도 각자 올바른 청구기간으로 묶인다.
- [ ] `지출 -400000원` 입력이 수입이 아니라 지출 차감으로 저장되고, 월 수입 합계는 늘지 않는다.
- [ ] 음수 지출이 포함돼도 월 요약, 예산, 카테고리 차트, 캘린더, 거래 목록이 깨지지 않는다.
- [ ] 정산 기능의 회수 이벤트와 음수 지출 규칙이 서로 충돌하지 않는다.

## 작업 로그

### 2026-03-09 - TODO 초안 작성

**작성자:** Codex

**조치:**
- 현재 자산/부채, 정산, 거래 저장 구조를 검토했다.
- 카드 결제주기와 음수 지출 요구를 PM/UXUI/BE/FE/Infra 기준으로 분해했다.
- 구현 계획서와 로드맵에 연결될 수 있도록 파일 기반 TODO를 작성했다.

**학습:**
- 기존 `accountImpactAmount`는 카드 부채 설계에도 재사용 가치가 높다.
- 부채 계정 잔액 방향 규칙은 현재 구현과 충돌 여지가 있어 선행 설계가 필요하다.
- 음수 지출은 단순 입력 허용보다 집계/차트 정책을 함께 정의해야 안전하다.
