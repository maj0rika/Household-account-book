---
date: 2026-03-09
phase: 14
type: fix
---

# Phase 14 정산 이력 저장 안정화

## 변경 내용

- 정산 이력 배치 저장을 단일 트랜잭션으로 묶어 여러 건 저장 중간 실패 시 부분 반영이 남지 않도록 수정했다.
- 정산 이력 저장 후 선택된 정산이 하나면 상세로, 여러 개면 월 보드로 이동하도록 라우팅을 보정했다.
- 정산 알림 자동 매칭 로직을 `transfer-matching-core.ts`로 분리하고 총무/참여자/모호한 후보 케이스를 회귀 테스트로 고정했다.

## 변경된 파일

- src/server/actions/settlement.ts
- src/server/settlement/transfer-matching-core.ts
- src/server/settlement/transfer-matching.ts
- src/server/settlement/transfer-matching.test.ts
- src/components/settlement/SettlementTransferParseResultSheet.tsx
- docs/implementation-plan.md

## 결정 사항

- 정산 알림 저장은 여러 건을 한 번에 처리하더라도 전부 성공하거나 전부 실패해야 한다.
- 자동 매칭은 총무 가계부 오염 방지와 직접 연결되므로 테스트로 고정한다.
- 정산 이력 저장 후 상세 진입은 단일 정산일 때만 허용하고, 여러 정산이 섞이면 보드로 돌려보내 사용자 맥락을 유지한다.
