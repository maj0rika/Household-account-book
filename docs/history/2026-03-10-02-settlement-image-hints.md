---
date: 2026-03-10
phase: 14
type: fix
---

# Phase 14 이미지 정산 힌트 보강

## 변경 내용

- OCR/보조 입력에 `보낼 금액`, `받을 금액`, `정산 요청`, `미입금`, `송금하기` 같은 정산 화면 문구가 보이면 `[이미지 정산 힌트]`를 붙여 이미지 파싱이 총무/참여자 역할을 더 안정적으로 해석하게 했다.
- 이미지 파싱 경로에서만 힌트가 붙도록 분리해 일반 텍스트 파싱에는 영향이 없게 유지했다.
- 카카오/토스 정산 화면의 participant/organizer 보조 텍스트 fixture를 테스트에 추가했다.

## 변경된 파일

- src/server/llm/settlement-message.ts
- src/server/llm/settlement-message.test.ts
- src/server/services/parse-core.ts
- src/server/llm/prompt.ts
- docs/implementation-plan.md
