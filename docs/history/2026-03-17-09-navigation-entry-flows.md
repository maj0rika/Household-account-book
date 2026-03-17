---
date: 2026-03-17
type: docs
---

# 네비게이션 최초 진입 플로우 추가

## 변경 내용

- 사이드 네비게이션 기준으로 거래 내역, 통계, 직접 입력, 자산/부채, 예산, 설정의 최초 진입 흐름을 Mermaid 차트로 추가했다;
- 전체 개요 문서에 메뉴별 최초 진입 요약 차트를 보강하고, 각 상세 문서 상단에 초기 접근 차트를 추가했다;
- 갱신된 문서를 기준으로 플로우차트 PDF를 다시 생성했다;

## 변경된 파일

- docs/flowchart/00-navigation-overview.md
- docs/flowchart/02-transaction-manual-and-parse.md
- docs/flowchart/03-assets-and-debts.md
- docs/flowchart/04-category-and-settings-flows.md
- docs/flowchart/05-date-filter-and-statistics-flows.md
- docs/flowchart/06-budget-and-recurring-flows.md
- docs/flowchart/pdf/00-navigation-overview.pdf
- docs/flowchart/pdf/02-transaction-manual-and-parse.pdf
- docs/flowchart/pdf/03-assets-and-debts.pdf
- docs/flowchart/pdf/04-category-and-settings-flows.pdf
- docs/flowchart/pdf/05-date-filter-and-statistics-flows.pdf
- docs/flowchart/pdf/06-budget-and-recurring-flows.pdf
- docs/history/2026-03-17-09-navigation-entry-flows.md
- docs/pipeline-state/2026-03-17-09-navigation-entry-flows.md
- docs/implementation-plan.md

## 결정 사항

- 최초 진입 흐름은 기존 상세 플로우와 겹치지 않도록 각 문서 상단에 짧은 입구 차트로 추가했다;
- PDF는 이전과 같은 단일 페이지 출력 규칙을 유지해 빈 페이지 문제를 다시 만들지 않도록 했다;

## 다음 할 일

- 이후 신규 메뉴가 추가되면 같은 방식으로 최초 진입 차트를 함께 확장한다;
