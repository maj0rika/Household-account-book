---
date: 2026-03-09
phase: 14
type: feature
---

# Phase 14 정산 완료 메시지와 입금 알림 자동 파싱

## 변경 내용

- LLM 출력 포맷에 `settlementTransfers` 배열을 추가해 정산 송금/입금 알림을 일반 거래와 분리해서 파싱하도록 확장했다.
- 파싱 성공 후 사용자 보유 미완료 정산과 자동 매칭해, 확실한 경우에는 정산/멤버를 바로 연결하고 애매한 경우에는 후보 목록을 함께 반환하도록 구현했다.
- `SettlementTransferParseResultSheet`를 추가해 정산 송금/입금 알림을 거래 생성 없이 `settlement_transfers`로만 저장하도록 연결했다.

## 변경된 파일

- src/server/llm/types.ts
- src/server/llm/prompt.ts
- src/server/llm/index.ts
- src/server/services/parse-core.ts
- src/server/settlement/transfer-matching.ts
- src/server/actions/settlement.ts
- src/components/settlement/SettlementTransferParseResultSheet.tsx
- src/components/transaction/UnifiedInputSection.tsx
- docs/implementation-plan.md

## 결정 사항

- 정산 입금/송금 알림은 `income`/`expense transaction`으로 저장하지 않고 별도 `settlement transfer` draft로만 처리해 가계부 오염을 방지했다.
- 자동 매칭은 `확실한 경우만 확정`하고, 애매하면 후보를 노출해 사용자가 연결 대상을 직접 보정하게 했다.
- 저장 흐름은 새 전용 페이지를 만들지 않고 기존 파싱 결과 시트 체인 뒤에 `SettlementTransferParseResultSheet`를 이어붙이는 방식으로 제한했다.

## 다음 할 일

- 실제 카카오페이 송금 완료 메시지, 토스 입금 알림, 은행 입금 문자 샘플로 수동 검증한다.
- 후보가 여러 개인 경우 제목/참여자명 기반 매칭 정확도를 더 높인다.
