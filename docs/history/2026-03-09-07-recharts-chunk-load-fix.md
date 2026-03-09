---
date: 2026-03-09
type: fix
---

# Recharts 동적 청크 로드 오류 수정

## 변경 내용

- `TransactionsLazySections`에서 `WeeklyBarChart`, `CategoryPieChart`를 `next/dynamic` 대신 정적 import로 바꿨다.
- `StatisticsLazySections`에서 `MonthlyTrendChart`를 정적 import로 바꿨다.
- Turbopack 개발 모드에서 `recharts` 청크 fetch 실패를 피하기 위해 차트 컴포넌트를 동일 클라이언트 번들에 포함하도록 정리했다.

## 변경된 파일

- src/components/dashboard/TransactionsLazySections.tsx
- src/components/statistics/StatisticsLazySections.tsx
- docs/history/2026-03-09-07-recharts-chunk-load-fix.md
- docs/implementation-plan.md

## 결정 사항

- `recharts` 기반 차트는 초기 청크 분리 이점보다 개발 안정성이 더 중요하므로 정적 import를 선택했다.
- 비차트 섹션(`RecurringTransactionManager`, `FilterableTransactionList`, `CategoryRankingList`)은 기존 동적 로딩을 유지해 과도한 범위 확장을 피했다.

## 다음 할 일

- `transactions`와 `statistics` 페이지에서 개발 서버 새로고침 후 차트가 정상적으로 다시 로드되는지 확인한다.
