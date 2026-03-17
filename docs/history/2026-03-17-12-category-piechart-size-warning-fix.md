---
date: 2026-03-17
type: fix
---

# CategoryPieChart 크기 경고 제거

## 변경 내용

- `CategoryPieChart`의 고정 크기 도넛 차트에서 `ResponsiveContainer`를 제거하고 정적 크기 `PieChart`로 교체했다;
- 차트 크기 상수를 분리해 중앙 라벨 오버레이와 클릭 동작은 유지하면서 Recharts 측정 경고 경로를 없앴다;

## 변경된 파일

- `src/components/dashboard/CategoryPieChart.tsx`
- `docs/pipeline-state/2026-03-17-12-category-piechart-size-warning-fix.md`

## 결정 사항

- 이 차트는 반응형 비율 계산이 필요한 레이아웃이 아니라 `140x140` 고정 크기 UI이므로, `ResponsiveContainer`보다 명시적 `width`/`height`가 더 안정적이다;
- 경고를 억지로 숨기지 않고 측정 자체를 제거하는 쪽이 런타임 노이즈와 향후 회귀 위험이 더 낮다;

## 다음 할 일

- 대시보드에서 실제 콘솔 경고가 사라졌는지 브라우저에서 한 번 더 확인한다;
