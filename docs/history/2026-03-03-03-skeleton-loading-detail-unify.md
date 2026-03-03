---
date: 2026-03-03
type: fix
---

# 스켈레톤 로딩 디테일 통일 — 모든 상황에서 풀 스켈레톤 표시

## 변경 내용

- 4개 탭(transactions, statistics, budget, assets)의 `loading.tsx`를 디테일한 풀 스켈레톤으로 교체
- 기존: MonthNavigator 스켈레톤 3개만 표시 → 네트워크 느릴 때 뭉뚱그려진 화면
- 변경: 각 페이지의 실제 레이아웃을 반영한 전체 섹션 스켈레톤
- assets 탭에 누락되어 있던 `loading.tsx` 신규 생성
- 미사용 `DashboardSkeleton.tsx` 컴포넌트 삭제

### 페이지별 스켈레톤 내용

| 페이지 | 스켈레톤 |
|--------|----------|
| transactions | MonthNavigator + 요약카드(3칸 그리드) + 캘린더(7x5그리드) + 주간차트 + 파이차트 + 고정거래 + 거래목록 |
| statistics | MonthNavigator + 요약카드 + 월별추이차트 + 카테고리랭킹(프로그레스바) |
| budget | MonthNavigator + 예산진행률 카드 4개 + 예산입력폼 |
| assets | 순자산카드(자산/부채 요약) + 자산목록 3개 + 부채목록 2개 |

## 변경된 파일

- src/app/(dashboard)/transactions/loading.tsx (전면 재작성)
- src/app/(dashboard)/statistics/loading.tsx (전면 재작성)
- src/app/(dashboard)/budget/loading.tsx (전면 재작성)
- src/app/(dashboard)/assets/loading.tsx (신규 생성)
- src/components/dashboard/DashboardSkeleton.tsx (삭제)

## 결정 사항

- Next.js의 `loading.tsx`는 라우트 전환 시 page.tsx JS가 로드되기 전에 표시됨
- `page.tsx` 내 Suspense fallback은 JS 로드 후에만 동작하므로, `loading.tsx`가 빈약하면 네트워크 환경에 따라 뭉뚱그려진 화면이 노출됨
- 해결: `loading.tsx`에 전체 레이아웃 스켈레톤을 넣어서 어떤 상황에서든 일관된 경험 제공
