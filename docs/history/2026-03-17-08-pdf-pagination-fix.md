---
date: 2026-03-17
type: docs
---

# 플로우차트 PDF 빈 페이지 및 여백 제거

## 변경 내용

- 플로우차트 PDF를 A4 다중 페이지 강제 분할 대신 문서 높이에 맞는 단일 페이지로 다시 생성했다;
- 출력용 HTML/CSS의 본문 패딩과 다이어그램 박스 여백을 줄여 빈 영역을 최소화했다;
- Mermaid 차트 구조는 유지하고 PDF 페이지네이션만 조정해 빈 페이지와 과도한 상하 여백을 제거했다;

## 변경된 파일

- docs/flowchart/pdf/00-navigation-overview.pdf
- docs/flowchart/pdf/01-auth-user-lifecycle.pdf
- docs/flowchart/pdf/02-transaction-manual-and-parse.pdf
- docs/flowchart/pdf/03-assets-and-debts.pdf
- docs/flowchart/pdf/04-category-and-settings-flows.pdf
- docs/flowchart/pdf/05-date-filter-and-statistics-flows.pdf
- docs/flowchart/pdf/06-budget-and-recurring-flows.pdf
- docs/history/2026-03-17-08-pdf-pagination-fix.md
- docs/pipeline-state/2026-03-17-08-pdf-pagination-fix.md
- docs/implementation-plan.md

## 결정 사항

- 이번 문제는 차트 레이아웃보다 PDF 페이지 분할 규칙이 원인이어서, Mermaid 문서 재구성보다 출력 방식 수정이 직접적인 해결책이라고 판단했다;
- 이후 동일 문서군 재출력 시에도 문서 실제 높이 기반 단일 페이지 출력을 우선 적용한다;

## 다음 할 일

- 이후 플로우차트 문서가 다시 커지면 PDF 재생성 시 단일 페이지 출력 기준을 유지한다;
