---
date: 2026-03-09
phase: 14
type: feature
---

# Phase 14 정산 기능 BE 코어 구현

## 변경 내용

- `transactions.amount`는 계속 `내 부담금`만 저장하고, 총무가 실제 결제한 `총액`은 `accountImpactAmount`로 분리했다;
- `settlements`, `settlement_members`, `settlement_transfers`를 추가해 정산 메타데이터, 참여자 상태, 송금/수금 이벤트를 별도 레이어로 저장하도록 확장했다;
- `createTransactions`에서 정산 초안이 들어오면 거래 저장과 동시에 정산 레코드를 생성하도록 연결했다;
- 정산 조회 액션과 상태 계산 로직을 추가해, 총무는 미수금 기준, 참여자는 송금 기준으로 진행률이 계산되도록 맞췄다;
- 정산 메모는 암호화 저장으로 통일하고, migration SQL의 중복 DDL은 수동으로 정리했다;

## 변경된 파일

- src/server/db/schema.ts
- src/server/db/migrations/0008_yellow_luckman.sql
- src/server/db/migrations/meta/0000_snapshot.json
- src/server/db/migrations/meta/0008_snapshot.json
- src/server/db/migrations/meta/_journal.json
- src/server/actions/transaction.ts
- src/server/actions/settlement.ts
- src/server/account-balance.ts
- src/server/settlement/utils.ts
- src/server/settlement/utils.test.ts
- src/server/llm/types.ts
- src/server/llm/index.ts
- src/server/llm/prompt.ts
- src/types/index.ts
- docs/implementation-plan.md
- docs/history/2026-03-09-17-phase14-be-core-implementation.md

## 결정 사항

- 총무 결제가 있어도 개인 가계부 합계와 카테고리 통계는 반드시 `transactions.amount`만 사용한다;
- 계좌 잔액 반영은 `accountImpactAmount ?? amount` 규칙으로 계산하되, 값이 동일하면 DB에는 `null`로 접어 저장한다;
- 정산 회수/송금은 기본 거래 수입/지출로 만들지 않고 `settlement_transfers` 이벤트로만 기록한다;
- 참여자 정산은 멤버 목록이 없어도 `send` transfer 누적으로 완료 상태가 바뀌어야 하므로, 진행률 계산을 총무/참여자 공통 함수로 통일했다;

## 다음 할 일

- `/settlements` 화면과 파싱 결과 시트 편집 UI를 구현해 저장 전 수정 흐름을 붙인다;
- 카카오톡/토스 스크린샷 입력에서 정산 초안 편집으로 이어지는 FE 흐름을 연결한다;
- 정산 transfer 액션과 대시보드 집계를 대상으로 통합 테스트 범위를 넓힌다;
