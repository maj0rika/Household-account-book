---
date: 2026-03-17
type: docs
---

# 플로우차트 밀도 재조정

## 변경 내용

- 너무 크게 세로 분할된 플로우차트를 문서당 1~2개의 핵심 차트로 다시 통합했다;
- 과도하게 세세한 중간 노드를 줄이고, 관련 단계를 하나의 흐름으로 묶어 중간 밀도로 재구성했다;
- PDF 렌더링 시 폰트, 여백, 노드 간격을 더 촘촘하게 조정해 한 페이지 가독성을 높였다;

## 변경된 파일

- docs/flowchart/00-navigation-overview.md
- docs/flowchart/02-transaction-manual-and-parse.md
- docs/flowchart/03-assets-and-debts.md
- docs/flowchart/04-category-and-settings-flows.md
- docs/flowchart/05-date-filter-and-statistics-flows.md
- docs/flowchart/pdf/00-navigation-overview.pdf
- docs/flowchart/pdf/02-transaction-manual-and-parse.pdf
- docs/flowchart/pdf/03-assets-and-debts.pdf
- docs/flowchart/pdf/04-category-and-settings-flows.pdf
- docs/flowchart/pdf/05-date-filter-and-statistics-flows.pdf
- docs/flowchart/pdf/06-budget-and-recurring-flows.pdf
- docs/pipeline-state/2026-03-17-07-flowchart-density-rebalance.md
- docs/implementation-plan.md

## 결정 사항

- 문서당 차트 수를 늘리기보다, 차트 하나 안에서 핵심 단계만 남기는 편이 더 읽기 좋다고 판단했다;
- Mermaid 노드 라벨은 짧게 유지하되, 흐름 단절이 생길 만큼 지나치게 잘게 쪼개지는 구조는 피한다;

## 다음 할 일

- 이후 플로우 문서를 추가하거나 수정할 때는 한 문서당 1~2개의 중간 밀도 차트를 기본값으로 유지한다;
