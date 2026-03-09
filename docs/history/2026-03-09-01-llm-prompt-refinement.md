---
date: 2026-03-09
type: fix
---

# LLM 프롬프트 수입/지출 판별 고도화

## 변경 내용

- `src/server/llm/prompt.ts` 시스템 프롬프트를 재작성해 intent 판별, income/expense 우선순위, 카테고리 매핑 힌트, 환불/정산/투자/대출/은행 메시지 규칙을 확장했다.
- `buildUserPrompt`, `buildImageUserPrompt`를 구조화해 원문 입력과 이미지 보조 입력을 더 안정적으로 전달하도록 정리했다.
- `src/server/llm/ood-filter.ts`의 금융 키워드를 넓혀 수입/지출/자산 관련 입력의 도메인 통과율을 높이고 안내 문구 예시를 보강했다.
- `src/components/transaction/NaturalInputBar.tsx`의 예시 문구를 소비, 환불, 투자수익, 자산, 부채 시나리오 중심으로 교체했다.

## 변경된 파일

- src/server/llm/prompt.ts
- src/server/llm/ood-filter.ts
- src/components/transaction/NaturalInputBar.tsx
- docs/history/2026-03-09-01-llm-prompt-refinement.md
- docs/implementation-plan.md

## 결정 사항

- 단순 키워드 매칭보다 우선순위 규칙과 경계 케이스 예시를 함께 주는 편이 income/expense 오분류를 줄인다.
- 이미지 파싱도 텍스트 파싱과 같은 규칙 집합을 따르도록 보조 프롬프트 구조를 통일한다.
- OOD 필터는 한 글자 키워드 대신 금융 맥락 단어를 넓게 커버하되, 과도한 오탐을 피하도록 유지한다.

## 다음 할 일

- 실사용 샘플(환불, 정산, 투자원금, 대출 실행, 카드 취소) 기준의 파싱 회귀 케이스를 따로 정리해 검증한다.
