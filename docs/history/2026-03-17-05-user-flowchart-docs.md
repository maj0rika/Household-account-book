---
date: 2026-03-17
type: docs
---

# 전체 사용자 플로우 차트 문서화

## 변경 내용

- 실제 라우트, 클라이언트 컴포넌트, 서버 액션, DB 처리 기준으로 사용자 액션 플로우를 Mermaid 차트로 정리했다;
- 네비게이션, 인증, 거래 입력/파싱, 자산/부채, 카테고리, 날짜 이동, 필터링, 예산, 고정 거래 흐름을 `docs/flowchart/`에 분리 문서로 추가했다;
- 각 문서를 `docs/flowchart/pdf/`에 대응 PDF로 생성했다;
- 카테고리 수정처럼 현재 코드상 미구현된 사용자 요구는 별도 차트에서 부재 상태로 명시했다;

## 변경된 파일

- docs/flowchart/00-navigation-overview.md
- docs/flowchart/01-auth-user-lifecycle.md
- docs/flowchart/02-transaction-manual-and-parse.md
- docs/flowchart/03-assets-and-debts.md
- docs/flowchart/04-category-and-settings-flows.md
- docs/flowchart/05-date-filter-and-statistics-flows.md
- docs/flowchart/06-budget-and-recurring-flows.md
- docs/flowchart/README.md
- docs/flowchart/pdf/00-navigation-overview.pdf
- docs/flowchart/pdf/01-auth-user-lifecycle.pdf
- docs/flowchart/pdf/02-transaction-manual-and-parse.pdf
- docs/flowchart/pdf/03-assets-and-debts.pdf
- docs/flowchart/pdf/04-category-and-settings-flows.pdf
- docs/flowchart/pdf/05-date-filter-and-statistics-flows.pdf
- docs/flowchart/pdf/06-budget-and-recurring-flows.pdf
- docs/pipeline-state/2026-03-17-05-user-flowcharts.md
- docs/implementation-plan.md

## 결정 사항

- 플로우는 기능 축으로 나누어 한 파일에 한 주제씩 정리했다;
- PDF는 Markdown 전체를 HTML로 렌더한 뒤 Mermaid 다이어그램을 브라우저에서 그려 출력하는 방식으로 생성했다;
- 사용자가 실제 수행 가능한 액션과 코드상 미구현 액션을 구분해 문서 오해를 줄였다;

## 다음 할 일

- 기능이 추가되거나 카테고리 수정처럼 미구현 액션이 도입되면 대응 플로우 문서와 PDF를 함께 갱신한다;
