---
date: 2026-03-10
phase: 14
type: fix
---

# Phase 14 은행 정산 알림 fixture 보강

## 변경 내용

- 열린 정산이 있을 때 사람 이름이 포함된 은행 입금/이체 알림도 정산 이력 후보로 인식하도록 힌트 규칙을 보강한다.
- 급여/일반 입금처럼 상대 이름이 없는 알림은 계속 정산으로 오인하지 않도록 유지한다.
- 카카오페이/토스 외에 plain bank/SMS 입금, plain send, 일반 송금 완료 차단 fixture까지 테스트에 추가한다.

## 변경된 파일

- src/server/llm/settlement-message.ts
- src/server/llm/settlement-message.test.ts
- docs/implementation-plan.md

## 결정 사항

- 서비스명이 없어도 `열린 정산 + 상대 이름 + 송금/입금 맥락`이 동시에 보이면 정산 이력 후보로 볼 수 있다.
- 총무 가계부 오염 방지가 우선이므로, 이 패턴은 열린 정산이 있을 때만 허용한다.
