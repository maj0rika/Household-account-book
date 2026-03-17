---
date: 2026-03-17
type: fix
---

# CategoryPieChart ResponsiveContainer 크기 경고 제거

## 변경 내용

- `ResponsiveContainer` 제거, `PieChart`에 `width={140} height={140}` 직접 지정
- 미사용 `ResponsiveContainer` import 제거

## 변경된 파일

- src/components/dashboard/CategoryPieChart.tsx

## 결정 사항

- 부모 div가 고정 크기(`h-[140px] w-[140px]`)이므로 `ResponsiveContainer`가 불필요
- `ResponsiveContainer`가 마운트 시점에 부모 크기를 `-1`로 측정하여 콘솔 경고 발생 → 고정 크기 직접 지정으로 해결
