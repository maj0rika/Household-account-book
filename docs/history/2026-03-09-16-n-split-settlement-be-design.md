---
date: 2026-03-09
phase: 14
type: feature
---

# N분의 1 정산 기능 BE 설계

## 변경 내용

- 총무 결제의 `총액`이 개인 가계부 지출 통계에 섞이지 않도록 BE 불변조건을 명시했다
- `transactions.amount`와 실제 계좌 반영 금액을 분리하기 위해 `accountImpactAmount` 모델을 제안했다
- `settlements`, `settlementMembers`, `settlementTransfers` 3계층 구조로 정산 추적과 회수 이벤트를 분리했다
- 정산 회수를 `income transaction`으로 저장하지 않는 원칙을 서버 액션/조회 규칙에 반영했다
- 파싱 응답도 `거래 초안`과 `정산 초안`을 분리하는 방향으로 재설계안을 정리했다

## 변경된 파일

- docs/brainstorms/2026-03-09-n-split-settlement-planning.md
- docs/brainstorms/2026-03-09-n-split-settlement-uxui.md
- docs/brainstorms/2026-03-09-n-split-settlement-be-design.md
- docs/implementation-plan.md
- docs/history/2026-03-09-16-n-split-settlement-be-design.md

## 결정 사항

- `transactions.amount`는 계속 개인 가계부 기준 금액으로 유지한다
- 총무 결제의 실제 계좌 영향은 `accountImpactAmount`로 분리한다
- 정산 회수/송금은 `settlementTransfers`로 기록하고, 기본 거래 수입/지출에 포함하지 않는다
- 총액을 실수로 통계에 합산하지 않도록 파싱 응답부터 `거래`와 `정산`을 분리한다

## 다음 할 일

- 스키마 초안을 실제 Drizzle 스키마로 옮기고 마이그레이션 범위를 확정한다
- `createTransactions`를 대체할 저장 액션 시그니처를 정한 뒤 구현에 들어간다
