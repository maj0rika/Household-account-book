---
date: 2026-03-09
type: fix
---

# 파싱 결과 시트 중첩 버튼 구조 수정

## 변경 내용

- 거래 파싱 결과 시트의 요약 행에서 확장 버튼과 삭제 버튼을 분리해 `<button>` 중첩을 제거했다.
- 자산/부채 파싱 결과 시트에도 같은 구조 개선을 적용하고, 상태 토글 배지를 `Badge asChild` 기반 실제 버튼으로 정리했다.
- 두 시트 모두 확장 버튼에 `aria-expanded`를 추가하고 삭제 액션에 `aria-label`을 부여했다.

## 변경된 파일

- src/components/transaction/ParseResultSheet.tsx
- src/components/assets/AccountParseResultSheet.tsx

## 결정 사항

- 전체 행을 하나의 버튼으로 유지하면 내부 액션 버튼과 충돌하므로, 확장 트리거와 행 액션을 형제 관계로 분리하는 구조가 가장 안전하다.
- 자산 시트는 같은 DOM 중첩 문제가 잠재되어 있어 동일 패턴으로 선제 정리했다.

## 다음 할 일

- 파싱 결과 시트에서 동일한 상호작용 패턴이 반복되는 다른 컴포넌트가 있는지 추가 점검한다.
