---
date: 2026-03-09
type: perf
---

# 거래 화면 초기 요청 수 감소

## 변경 내용

- `src/app/(dashboard)/layout.tsx`에서 카테고리/계정 데이터를 서버에서 먼저 조회해 `UnifiedInputSection`에 초기 props로 전달하도록 바꿨다.
- `src/components/transaction/UnifiedInputSection.tsx`의 마운트 직후 `getUserCategories()` / `getAccounts()` 서버 액션 호출을 제거했다.
- `src/components/layout/RoutePrefetcher.tsx`가 현재 페이지 경로는 prefetch하지 않도록 조정했다.

## 변경된 파일

- src/app/(dashboard)/layout.tsx
- src/components/transaction/UnifiedInputSection.tsx
- src/components/layout/RoutePrefetcher.tsx
- docs/history/2026-03-09-10-transaction-request-reduction.md
- docs/implementation-plan.md

## 결정 사항

- 거래 화면에서 필요한 초기 데이터는 이미 서버 렌더링 단계에서 확보할 수 있으므로, 클라이언트 마운트 직후 같은 데이터를 다시 서버 액션으로 요청하지 않는다.
- `router.prefetch()`는 다른 핵심 탭만 대상으로 하고, 현재 보고 있는 경로까지 다시 요청하지 않는다.

## 다음 할 일

- 거래 결과 시트 종료 후 동기화 요청도 필요 최소화할 수 있는지, 저장 결과를 낙관적으로 반영하는 방식으로 추가 검토한다.
