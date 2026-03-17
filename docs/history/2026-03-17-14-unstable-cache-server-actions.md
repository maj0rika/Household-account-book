---
date: 2026-03-17
type: perf
---

# Server Action 데이터 캐싱 (unstable_cache)

## 변경 내용

- 읽기 전용 Server Action 8개에 `unstable_cache` 래핑 적용
  - `transaction.ts`: `getTransactions`, `getMonthlySummary`, `getCategoryBreakdown`, `getDailyExpenses`, `getMonthlyCalendarData`, `getUserCategories`
  - `account.ts`: `getAccounts`, `getAccountSummary`
- `cache-keys.ts`에 `CacheTags` 상수와 `revalidateTag()` 기반 무효화 추가
- 모든 mutation 함수에서 `revalidateTag()` 호출 추가 (기존 `revalidatePath()` 유지)

## 변경된 파일

- `src/lib/cache-keys.ts`
- `src/server/actions/transaction.ts`
- `src/server/actions/account.ts`

## 결정 사항

- `userId`는 캐시 바깥에서 구해 Dynamic 경로를 유지하되, DB 쿼리만 캐싱
- 캐시 키에 `userId`를 포함해 사용자 간 데이터 격리 보장
- 필터가 있는 `getTransactions`는 캐시 키 폭발 방지를 위해 캐시 우회
- `revalidate: 60` (거래), `120` (계좌/카테고리)로 시간 기반 자동 갱신
- 기존 `revalidatePath()` + `revalidateTag()` 이중 무효화로 안정성 확보
