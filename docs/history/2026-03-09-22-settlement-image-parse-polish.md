---
date: 2026-03-09
phase: 14
type: feature
---

# Phase 14 정산 스크린샷 파싱 보강

## 변경 내용

- 이미지 파싱 프롬프트에 카카오톡/토스 정산 화면 전용 규칙을 추가해 정산 초안 필드 추출을 더 강하게 유도했다.
- 파싱 결과 시트, 거래 리스트, 정산 보드/상세에서 `카카오 정산`, `토스 정산`, `이미지 정산` 출처 배지를 노출했다.
- 이미지 첨부 프리뷰 하단에 정산 스크린샷 자동 파싱 안내 문구를 추가했다.

## 변경된 파일

- src/server/llm/prompt.ts
- src/lib/settlement.ts
- src/components/transaction/NaturalInputBar.tsx
- src/components/transaction/ParseResultSheet.tsx
- src/components/transaction/TransactionItemContent.tsx
- src/components/settlement/SettlementDraftEditor.tsx
- src/components/settlement/SettlementBoard.tsx
- src/components/settlement/SettlementDetailSheet.tsx
- docs/implementation-plan.md

## 결정 사항

- OCR이나 별도 정산 파서를 새로 만들지 않고, 기존 이미지 LLM 파이프라인에 정산 화면 전용 규칙을 추가하는 방향으로 범위를 제한했다.
- 출처 표시는 `src/lib/settlement.ts`의 공통 helper로 통일해 파싱 결과 시트와 저장 후 화면이 같은 용어를 쓰게 맞췄다.
- 총무 가계부 오염 방지 원칙은 그대로 유지하고, 이번 변경은 이미지 입력 진입과 결과 신뢰도 개선에만 집중했다.

## 다음 할 일

- 정산 완료 메시지/입금 알림 자동 파싱 후속 범위를 구체화한다.
- 실제 카카오톡/토스 샘플 이미지 기준 파싱 품질을 수동 검증한다.
