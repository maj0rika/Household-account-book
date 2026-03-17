---
date: 2026-03-17
type: fix
---

# Drawer 접근성 및 차트 크기 경고 수정

## 변경 내용

- 공용 `Drawer`가 열릴 때 기존 활성 요소의 포커스를 정리해 `aria-hidden` 경고가 나지 않도록 했다;
- `TransactionEditSheet`와 `AccountFormSheet`에 `DrawerDescription`을 추가해 `DialogContent` 설명 누락 경고를 제거했다;
- 거래 목록과 주간 차트에서 시트를 열기 직전에 포커스를 정리하도록 보강했다;
- `TransactionsLazySections`의 `contentVisibility: auto`를 제거해 `Recharts ResponsiveContainer`가 음수 크기로 측정되는 경고를 막았다;

## 변경된 파일

- `src/components/ui/drawer.tsx`
- `src/lib/accessibility.ts`
- `src/components/transaction/TransactionEditSheet.tsx`
- `src/components/assets/AccountFormSheet.tsx`
- `src/components/transaction/TransactionList.tsx`
- `src/components/dashboard/DayTransactionSheet.tsx`
- `src/components/dashboard/WeeklyBarChart.tsx`
- `src/components/dashboard/TransactionsLazySections.tsx`
- `docs/pipeline-state/2026-03-17-11-drawer-accessibility-and-chart-warning.md`

## 결정 사항

- 포커스 잔류 경고는 개별 시트마다 우회하지 않고 공용 `Drawer`와 주요 오픈 트리거 양쪽에서 함께 처리해 재발 범위를 줄였다;
- 차트 경고는 `ResponsiveContainer` 자체 문제가 아니라 숨김 렌더링 전략과의 충돌로 보고, 측정이 안정적인 일반 렌더링으로 되돌렸다;

## 다음 할 일

- 브라우저에서 거래 화면과 대시보드 화면을 실제로 열어 콘솔 경고가 사라졌는지 수동 확인한다;
