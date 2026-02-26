---
date: 2026-02-26
type: complete
pipeline: true
---

# 최근 10개 커밋 코드 리뷰 + 전체 수정 완료

## 요청 요약
최근 10개 커밋(05e6a85~3f58357)에 대한 전체 코드 리뷰 및 버그 점검 + 발견된 28건 이슈 전체 수정

## 변경 내용

### 1. BE: 트랜잭션 내 중복 판정 이동 (H3, H4, M2, L4)
- 고정거래 중복 판정 쿼리를 `db.transaction()` 내부로 이동하여 TOCTOU 레이스 컨디션 해결
- 모든 항목이 중복으로 건너뛰어진 경우 `message` 필드로 사용자 안내
- `description` fallback에서 정규화 전 `item.category` → `finalCategory` 사용
- `result.rowCount` 검증을 `!result.rowCount || result.rowCount === 0` 으로 안전하게 변경

### 2. BE: 타임존 유틸리티 + month 파라미터 검증 (H5)
- `getKSTDate()`, `formatDateLocal()`, `isValidMonth()` 유틸리티를 `@/lib/format.ts`에 추가
- `getCurrentMonth()`를 KST 기준으로 수정 (서버 UTC 환경에서 자정~09시 사이 오류 방지)
- `transactions/page.tsx`에서 `month` 파라미터 검증 추가 (URL 조작 방어)

### 3. BE: 에러 클래스 도입 + LLM 코드 품질 개선 (M6, L10)
- `LLMTimeoutError` 커스텀 에러 클래스 도입 (`src/server/llm/index.ts`)
- `resolveTimeoutMs`의 `!timeoutMs` → `timeoutMs == null` 으로 수정
- "firewoks" 오타 → "fireworks" 수정

### 4. FE: PostActionBanner 개선 (H1, H2)
- H1: `router.replace(pathname)` 으로 URL 쿼리 파라미터 클리닝 (새로고침 시 배너 재표시 방지)
- H2: MutationObserver 기반 Suspense-aware 스크롤 (120ms 고정 타이머 → DOM 감시)
- `role="alert"` + `aria-live="polite"` 접근성 속성 추가

### 5. FE: React 패턴 개선 (M1, M3, M12)
- `AccountParseResultSheet.handleRemove`에서 `queueMicrotask` 적용 (렌더 중 부모 setState 방지)
- `UnifiedInputSection`의 시트 종료 후 동기화 useEffect에 `mounted` 가드 추가
- `cats as Category[]` 타입 단언 제거 (`getUserCategories`가 이미 `Category[]` 반환)

### 6. FE: 금액 포맷팅 유틸리티 중앙화 (M4, M11)
- `formatCurrencyInput()`, `parseCurrencyInput()` 유틸리티를 `@/lib/format.ts`에 추가
- 5개 컴포넌트의 인라인 포맷팅 로직을 중앙 유틸리티로 교체
- M4: `formatNumericInput`의 0값 입력 시 빈 문자열 반환 버그 해결

### 7. FE: CSS/성능 (M7)
- `containIntrinsicSize: "700px"` → `containIntrinsicBlockSize: "700px"` (width 힌트 오염 방지)

### 8. FE: 접근성 복원 (M10)
- `ParseResultSheet`, `AccountParseResultSheet` 요약 행: `<div onClick>` → `<button type="button">` 으로 변경

### 9. FE/BE: 낮은 우선순위 수정
- L1: `src/app/global-error.tsx` 추가 (루트 레이아웃 에러 바운더리)
- L2: `AccountBatchItem`을 discriminated union으로 변경
- L3: `upsertParsedAccountsBatch` 빈 배열 검증 추가
- L6: MonthNavigator 월 점프 다이얼로그에 `max={currentMonth}` 추가
- L9: `lastSubmissionRef` 성공 시 `null` 클리어 (메모리 누수 방지)
- L11: WeeklyBarChart "오늘" 시각적 강조 복원 (KST 기준)
- L7: `buildSearchQuery` 유틸리티 추가 (향후 적용용)

## 변경된 파일
| 파일 | 작업 | 설명 |
|------|------|------|
| `src/server/actions/transaction.ts` | 수정 | H3,H4,M2,L4 — 트랜잭션 내 중복판정+description 수정 |
| `src/server/actions/account.ts` | 수정 | L2,L3,L4 — discriminated union+빈배열+rowCount |
| `src/server/actions/parse-unified.ts` | 수정 | M6,L10 — 에러 판별 개선+오타 수정 |
| `src/server/llm/index.ts` | 수정 | M6 — LLMTimeoutError+resolveTimeoutMs |
| `src/lib/format.ts` | 수정 | H5,M4,M11,L7 — KST 유틸+포맷팅+쿼리 유틸 |
| `src/app/(dashboard)/transactions/page.tsx` | 수정 | H5 — KST 날짜+month 검증+인라인 함수 제거 |
| `src/app/global-error.tsx` | 신규 | L1 — 글로벌 에러 바운더리 |
| `src/components/common/PostActionBanner.tsx` | 수정 | H1,H2 — URL 클리닝+Suspense 스크롤+ARIA |
| `src/components/assets/AccountParseResultSheet.tsx` | 수정 | M1,M10 — queueMicrotask+button+포맷 |
| `src/components/transaction/UnifiedInputSection.tsx` | 수정 | M3,M12 — mounted 가드+타입 단언 제거 |
| `src/components/transaction/NaturalInputBar.tsx` | 수정 | L9 — lastSubmissionRef 클리어 |
| `src/components/transaction/ParseResultSheet.tsx` | 수정 | M10,M11 — button+포맷 유틸 |
| `src/components/transaction/RecurringTransactionManager.tsx` | 수정 | M4,M11 — 포맷 유틸 중앙화 |
| `src/components/transaction/ManualInputDialog.tsx` | 수정 | M11 — 포맷 유틸 중앙화 |
| `src/components/transaction/TransactionEditSheet.tsx` | 수정 | M11 — 포맷 유틸 중앙화 |
| `src/components/dashboard/MonthNavigator.tsx` | 수정 | L6 — 미래 월 제한 |
| `src/components/dashboard/WeeklyBarChart.tsx` | 수정 | L11 — 오늘 강조 복원 |
| `src/components/dashboard/TransactionsLazySections.tsx` | 수정 | M7 — containIntrinsicBlockSize |
| `src/components/statistics/StatisticsLazySections.tsx` | 수정 | M7 — containIntrinsicBlockSize |

## 설계 결정
### TOCTOU 해결 방식
- **선택**: DB 트랜잭션 내에서 기존 데이터 조회 + 삽입을 원자적으로 수행
- **이유**: Serializable isolation 없이도 트랜잭션 내 순차 실행으로 중복 삽입 방지
- **대안 (미채택)**: DB 유니크 제약 조건 (스키마 변경 필요)

### KST 타임존 처리
- **선택**: 서버 사이드에서 UTC → KST 수동 변환
- **이유**: Vercel 서버가 UTC 기준이므로 한국 사용자 자정~09시 문제 해결
- **대안 (미채택)**: TZ 환경변수 설정 (Vercel serverless에서 불안정)

## 검증 결과
- TypeScript: ✅ `npx tsc --noEmit` 통과
- 빌드: ✅ `npm run build` 성공
- 테스트: ⬜ 별도 실행 필요

## 다음 할 일
- DB에 잔존하는 `*_enc` 컬럼 `DROP COLUMN` 마이그레이션 (암호화 revert 후)
- 에러 모니터링 서비스(Sentry) 연동 (console.error → Sentry 전환)
- `ssr: false` 재검토: 순수 리스트 컴포넌트에서 SSR 활성화 고려
- RoutePrefetcher 필요성 재평가 (`<Link prefetch>` 중복)
