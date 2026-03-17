---
date: 2026-03-17
type: docs
---

# 플로우차트 가독성 개선

## 변경 내용

- 좌우로 과도하게 길어진 플로우차트를 단계별 세로형 차트로 다시 나눴다;
- 한 문서 안에 여러 흐름이 섞여 있던 차트는 기능별 소차트로 분리했다;
- 긴 노드 라벨을 줄이고, 상세 설명은 차트 밖 섹션으로 유지했다;
- 수정된 Markdown 기준으로 `docs/flowchart/pdf/` PDF를 다시 생성했다;

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
- docs/pipeline-state/2026-03-17-06-flowchart-readability-fix.md
- docs/implementation-plan.md

## 결정 사항

- 큰 차트 하나로 모든 흐름을 담기보다, 페이지 안에서 3~5개의 세로 차트로 나누는 편이 PDF 가독성이 훨씬 좋다고 판단했다;
- Mermaid 노드는 역할 중심의 짧은 텍스트만 남기고, 코드 경로는 하단 관련 코드 목록으로 분리했다;

## 다음 할 일

- 이후 플로우 문서를 추가할 때도 기본 원칙을 세로형 소차트 분리 방식으로 유지한다;
