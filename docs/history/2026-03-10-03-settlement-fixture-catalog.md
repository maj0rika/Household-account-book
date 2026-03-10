---
date: 2026-03-10
phase: 14
type: refactor
---

# Phase 14 정산 fixture 카탈로그 정리

## 변경 내용

- 정산 알림/이미지 힌트 샘플을 공용 fixture 카탈로그로 정리해 테스트와 수동 검증 기준을 한 곳에서 관리하도록 정리한다.
- `settlement-message.test.ts`가 fixture 카탈로그를 순회하도록 바꿔 이후 샘플 추가 비용을 낮춘다.

## 변경된 파일

- src/server/llm/settlement-fixtures.ts
- src/server/llm/settlement-message.test.ts
- docs/implementation-plan.md

## 결정 사항

- 정산 파싱 정확도 보정은 ad-hoc 테스트보다 fixture 카탈로그 방식이 유지보수에 유리하다.
- 이후 카카오/토스 실샘플 추가도 같은 파일에만 누적하면 되도록 구조를 단순화한다.

## 검증

- `npm test`
- `npx tsc --noEmit`
- `npm run build`

## 다음 할 일

- 실제 카카오/토스 정산 스크린샷과 알림 샘플을 fixture 카탈로그에 계속 누적한다.
