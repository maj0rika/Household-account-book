---
date: 2026-03-17
type: fix
---

# Dialog Description 접근성 경고 제거

## 변경 내용

- `CategoryManager`의 카테고리 추가 다이얼로그에 `DialogDescription`을 추가했다;
- `BudgetForm`의 예산 추가/수정 다이얼로그에 각각 `DialogDescription`을 추가했다;
- `DialogContent` 사용처 전체를 재점검해 설명 누락 범위를 확인했다;

## 변경된 파일

- src/components/settings/CategoryManager.tsx
- src/components/budget/BudgetForm.tsx
- docs/pipeline-state/2026-03-17-19-dialog-description-warning-fix.md

## 결정 사항

- 공용 `DialogContent`에 숨김 fallback 설명을 넣는 대신, 각 다이얼로그 목적에 맞는 설명을 개별 사용처에 명시했다;
- 이 방식이 접근성 의미를 보존하면서 다른 다이얼로그에 불필요한 기본 설명을 강제하지 않는다고 판단했다;

