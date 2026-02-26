---
date: 2026-02-26
type: complete
pipeline: true
---

# 주간 지출 바 차트 인터랙션 개선 (바텀시트 방식)

## 요청 요약
주간 지출 바 터치 시 URL 기반 필터 대신 바텀시트(Drawer)로 해당 날짜 거래 내역 즉시 표시

## 변경 내용
### 1. WeeklyBarChart — URL 라우팅 → 클라이언트 상태 + Drawer
- `useRouter`/`useSearchParams`/`useTransition` 제거
- `useState`로 선택 날짜 관리
- 기존 `DayTransactionSheet` 컴포넌트 재사용하여 바텀시트 표시
- `transactions`, `categories` props 추가 (Drawer에 전달)

### 2. TransactionsLazySections — focusDate prop 제거
- `focusDate` prop 제거
- `transactions`, `categories`를 WeeklyBarChart에 전달

### 3. FilterableTransactionList — focusDate 관련 로직 제거
- `focusDate` prop 및 관련 필터/뱃지/UI 전부 제거
- `useRouter`/`useSearchParams` import 제거
- `applyFilters` 함수에서 focusDate 필터 제거

### 4. transactions/page.tsx — focusDate searchParam 처리 제거
- `searchParams` 타입에서 `focusDate` 제거
- `TransactionsInsightsSection`에서 `rawFocusDate` 파라미터 제거

## 변경된 파일
| 파일 | 작업 | 설명 |
|------|------|------|
| `src/components/dashboard/WeeklyBarChart.tsx` | 수정 | URL push → useState + DayTransactionSheet |
| `src/components/dashboard/TransactionsLazySections.tsx` | 수정 | focusDate prop 제거, transactions/categories 전달 |
| `src/components/transaction/FilterableTransactionList.tsx` | 수정 | focusDate 관련 로직 전부 제거 |
| `src/app/(dashboard)/transactions/page.tsx` | 수정 | focusDate searchParam 처리 제거 |

## 설계 결정
### InteractiveCalendar 패턴 재사용
- **선택**: 기존 `DayTransactionSheet` 컴포넌트를 재사용
- **이유**: 캘린더 날짜 클릭과 동일한 UX 패턴, 코드 중복 없음
- **대안 (미채택)**: 새로운 인라인 확장 UI — 복잡도 증가, 기존 패턴과 불일치

### URL 파라미터 완전 제거
- **선택**: `focusDate` searchParam 완전 제거
- **이유**: 서버 라운드트립 제거로 즉시 반응, 보더 중복 현상 해결
- **대안 (미채택)**: URL 유지하면서 클라이언트 처리 — 불필요한 복잡도

## 검증 결과
- TypeScript: ✅
- 빌드: ✅
- 테스트: N/A (UI 인터랙션 변경)

## 다음 할 일
- 없음 (완결)
