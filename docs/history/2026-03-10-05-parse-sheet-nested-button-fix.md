---
date: 2026-03-10
type: fix
---

# 파싱 결과 시트 중첩 버튼 구조 수정

## 변경 내용

- 자산/부채 파싱 결과 시트의 요약 행에서 바깥 `button` 안에 삭제 버튼이 들어가던 구조를 분리한다.
- 거래 파싱 결과 시트에도 같은 중첩 `button` 패턴이 있어 동일하게 정리한다.
- 요약 행 확장 토글과 개별 액션 버튼을 분리해 hydration 오류와 DOM 중첩 경고를 막는다.

## 변경된 파일

- docs/history/2026-03-10-05-parse-sheet-nested-button-fix.md
- docs/implementation-plan.md
- src/components/assets/AccountParseResultSheet.tsx
- src/components/transaction/ParseResultSheet.tsx

## 결정 사항

- 아코디언 확장은 전용 요약 버튼이 담당하고, 삭제/업데이트 같은 개별 액션은 형제 버튼으로 분리한다.
- 시각 배치는 최대한 유지하되, DOM 유효성이 우선이므로 한 개의 버튼 안에 다른 버튼이 들어가지 않게 구조를 재배치한다.

## 다음 할 일

- 파싱 결과 시트를 실제로 열어 확장 토글과 삭제 버튼이 각각 독립적으로 동작하는지 수동 점검한다.
