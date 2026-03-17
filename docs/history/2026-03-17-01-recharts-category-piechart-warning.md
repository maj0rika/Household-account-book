---
date: 2026-03-17
type: docs
---

# Recharts CategoryPieChart 크기 경고 원인 기록

## 변경 내용

- `src/components/dashboard/CategoryPieChart.tsx`의 `ResponsiveContainer width="100%" height="100%"` 사용 방식 때문에 부모 크기 측정이 지연될 때 Recharts가 `width(-1)`, `height(-1)` 경고를 출력할 수 있음을 기록했다;
- `src/components/dashboard/TransactionsLazySections.tsx`의 `contentVisibility: "auto"`가 초기 레이아웃 계산 시점을 늦춰 경고 발생 조건에 영향을 줄 수 있음을 함께 정리했다;
- 이번 작업은 원인 기록만 수행했고, 차트 렌더링 로직 자체는 변경하지 않았다;

## 변경된 파일

- docs/pipeline-state/2026-03-17-01-recharts-category-piechart-warning.md
- docs/history/2026-03-17-01-recharts-category-piechart-warning.md
- docs/implementation-plan.md

## 결정 사항

- 단순 문의에 대한 후속 기록이므로 문서 전용 작업으로 처리하고 `PM`만 활성화했다;
- 경고 자체를 바로 숨기지 않고, 현재 코드 구조에서 왜 발생하는지와 추후 수정 포인트를 먼저 남겼다;

## 다음 할 일

- 필요 시 `CategoryPieChart`의 `ResponsiveContainer` 높이를 고정값으로 바꾸거나, 차트 영역을 `contentVisibility` 영향 밖으로 분리하는 별도 수정 작업을 진행한다;
