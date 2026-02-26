---
date: 2026-02-26
type: complete
pipeline: true
---

# FE/BE/Infra 성능 최적화

## 요청 요약
FE/BE 전반 성능 최적화 — 페이지 로드 및 인터랙션 체감 속도 향상

## 변경 내용
### 1. DB 인덱스 추가 (가장 큰 효과)
- `transactions` 테이블: `(userId, date)`, `(userId, type, date)`, `(categoryId)` 인덱스 추가
- `recurring_transactions` 테이블: `(userId, isActive)` 인덱스 추가
- 월별 조회, 집계 쿼리에서 full table scan → index scan으로 전환

### 2. Budget 쿼리 병렬화
- `getBudgetsWithSpent()`: 예산 조회 + 지출 합계를 순차 → `Promise.all()` 병렬로 변경

### 3. 불필요한 복호화 제거
- `getTransactions()`: `originalInput` 컬럼을 SELECT에서 제외 + 복호화 스킵
- UI에서 사용하지 않는 암호화 필드의 AES-256-GCM 복호화 N회 절약

### 4. autoApplyRecurringTransactions non-blocking
- 페이지 로드 시 `await` → fire-and-forget으로 변경 (`.catch(() => {})`)
- 페이지 렌더링이 고정 거래 적용 완료를 기다리지 않음

### 5. 클라이언트 O(n) → O(1) 조회 최적화
- `InteractiveCalendar`, `WeeklyBarChart`: 날짜 선택 시 `filter()` → `Map` 사전 구성

### 6. DB 연결 풀 최적화
- Pool max: 기본값(10) → 20, idle/connection timeout 명시 설정

### 7. Recharts outline 보더 제거
- `globals.css`에 `.recharts-wrapper *` outline: none 추가

## 변경된 파일
| 파일 | 작업 | 설명 |
|------|------|------|
| `src/server/db/schema.ts` | 수정 | 4개 인덱스 정의 추가 |
| `src/server/db/migrations/0006_add-performance-indexes.sql` | 신규 | 인덱스 마이그레이션 SQL |
| `src/server/db/migrations/meta/_journal.json` | 수정 | 마이그레이션 저널 엔트리 추가 |
| `src/server/db/index.ts` | 수정 | DB 풀 max=20, timeout 설정 |
| `src/server/actions/budget.ts` | 수정 | 순차 쿼리 → Promise.all 병렬화 |
| `src/server/actions/transaction.ts` | 수정 | originalInput SELECT/복호화 제거 |
| `src/app/(dashboard)/transactions/page.tsx` | 수정 | autoApply non-blocking |
| `src/components/dashboard/InteractiveCalendar.tsx` | 수정 | Map 사전 구성 |
| `src/components/dashboard/WeeklyBarChart.tsx` | 수정 | Map 사전 구성 |
| `src/app/globals.css` | 수정 | Recharts outline 제거 |
| `next.config.ts` | 수정 | optimizePackageImports, serverExternalPackages, 캐시 헤더 |
| `src/app/layout.tsx` | 수정 | Geist 폰트 display: swap 추가 |

### 8. Infra 최적화
- `next.config.ts`: `optimizePackageImports` (lucide-react, recharts, motion), `serverExternalPackages` (pg), 정적 에셋/폰트 immutable 캐시 헤더
- `src/app/layout.tsx`: Geist 폰트에 `display: "swap"` 명시 (CLS 방지)

## 설계 결정
### autoApply를 fire-and-forget으로 변경
- **선택**: `await` 제거, catch로 에러 무시
- **이유**: 고정 거래 자동 생성은 이미 중복 방지가 내장되어 있어 다음 페이지 로드 시 재시도 가능
- **대안 (미채택)**: 별도 cron job — 인프라 추가 필요

### originalInput 복호화 스킵
- **선택**: SELECT에서 아예 제외 + null 반환
- **이유**: UI 어디서도 originalInput을 참조하지 않음
- **대안 (미채택)**: 지연 복호화(lazy) — 불필요한 복잡도

## 검증 결과
- TypeScript: ✅
- 빌드: ✅
- DB 마이그레이션: ✅ (drizzle-kit push 성공)

## 다음 할 일
- 없음 (완결)
