---
date: 2026-02-26
type: complete
pipeline: true
---

# 성능 체감 개선 1단계 완료

## 요청 요약
주요 버튼/탭 즉시 피드백 통일, 탭 전환 낙관적 UX, 성능 계측 3종 추가, 최소 렌더 최적화 적용

## 변경 내용
### 1. 즉시 피드백 통일 (A)
- Button 컴포넌트: `transition-all` → `transition-[color,background-color,border-color,box-shadow,transform]`으로 최적화. active 시 `duration-75`로 즉각 반응
- BottomTabBar: pressed 피드백에 `transition-[color,transform]` 통일
- Sidebar: 네비게이션 항목에 `active:scale-[0.97]` + `active:duration-75` 추가

### 2. 탭 전환 체감 개선 (B)
- BottomTabBar에 `pendingHref` 로컬 상태 도입 — 탭 클릭 즉시 하이라이트 변경 (낙관적 전환)
- pathname 변경 시 자동 초기화, 3초 안전 타임아웃으로 실패 시 롤백
- NaturalInputBar: sessionStorage 기반 입력 텍스트 보존 (`draft-natural-input` 키)

### 3. 성능 계측 3종 (C)
- `src/lib/perf.ts`: `perfStart()`, `perfAction()` — performance.mark/measure 래퍼
- `src/hooks/useTabSwitchPerf.ts`: 탭 전환 시작~pathname 변경 시간 측정
- `src/hooks/useRenderPerf.ts`: 컴포넌트 마운트~첫 paint 근사 시간 측정
- `src/hooks/useDeferredLoading.ts`: 200ms 지연 로딩 인디케이터 훅
- TransactionsLazySections에 render 계측, MonthNavigator에 액션 계측, BottomTabBar에 탭 전환 계측 삽입

### 4. 렌더 최적화 (D)
- `TransactionItemContent`: `React.memo` 적용
- `TransactionItem`: `React.memo` 적용 + `onEdit` 콜백 `useCallback`으로 안정화

## 변경된 파일
| 파일 | 작업 | 설명 |
|------|------|------|
| `src/lib/perf.ts` | 신규 | performance.mark/measure 래퍼 유틸 |
| `src/hooks/useRenderPerf.ts` | 신규 | 화면 렌더 시간 계측 훅 |
| `src/hooks/useTabSwitchPerf.ts` | 신규 | 탭 전환 시간 계측 훅 |
| `src/hooks/useDeferredLoading.ts` | 신규 | 200ms 지연 로딩 표시 훅 |
| `src/components/ui/button.tsx` | 수정 | transition 최적화 (transform 즉시 반응) |
| `src/components/layout/BottomTabBar.tsx` | 수정 | 낙관적 탭 전환 + 계측 + pressed 피드백 |
| `src/components/layout/Sidebar.tsx` | 수정 | pressed 피드백 추가 |
| `src/components/dashboard/MonthNavigator.tsx` | 수정 | 월 이동 액션 계측 삽입 |
| `src/components/dashboard/TransactionsLazySections.tsx` | 수정 | 렌더 계측 삽입 |
| `src/components/transaction/TransactionItemContent.tsx` | 수정 | React.memo 적용 |
| `src/components/transaction/TransactionList.tsx` | 수정 | TransactionItem memo + onEdit useCallback |
| `src/components/transaction/NaturalInputBar.tsx` | 수정 | sessionStorage 입력 보존 |

## 설계 결정
### 낙관적 탭 전환 방식
- **선택**: pendingHref 로컬 상태 + pathname 변경 시 자동 초기화 + 3초 타임아웃
- **이유**: useOptimistic보다 간단하고, pathname과의 동기화 버그 위험 최소화
- **대안 (미채택)**: React useOptimistic — 복잡도 대비 이점 미미

### Button transition 최적화
- **선택**: `transition-[...,transform]` 기본 포함 + `active:duration-75`
- **이유**: `active:transition-transform`이 기본 transition을 오버라이드하는 문제 회피
- **대안 (미채택)**: `transition-all` 유지 — layout 속성까지 transition 대상이 되어 성능 저하

### 성능 계측 방식
- **선택**: performance.mark/measure + 개발환경 콘솔 로그
- **이유**: 브라우저 DevTools Performance 탭과 호환, 프로덕션에서도 DevTools로 확인 가능
- **대안 (미채택)**: Web Vitals 라이브러리 — 1단계에서는 과도

## 검증 결과
- TypeScript: ✅
- 빌드: ✅
- 테스트: ✅ (16 passed)
- Lint: ✅ (No warnings or errors)

## 다음 할 일
- useDeferredLoading 훅을 거래 삭제/저장 등 Server Action 버튼에 적용 (2단계)
- 에러 배너 디바운스 훅 구현 + 적용 (2단계)
- 실제 성능 수치 측정 후 병목 추가 식별
- 가상화(virtualization) 적용 검토 (거래 리스트가 100건 이상일 때)
