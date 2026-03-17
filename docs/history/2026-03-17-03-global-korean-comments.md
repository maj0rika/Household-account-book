---
date: 2026-03-17
type: docs
---

# 전역 한글 주석 보강

## 변경 내용

- 주석이 부족했던 TypeScript/TSX 파일 전반에 파일 역할, 사용 위치, 흐름을 설명하는 한글 헤더를 추가했다;
- 파싱 API, 인증, 자산/고정거래 서버 액션, 보안 정책, 거래 페이지 엔트리처럼 추적 난도가 높은 파일에는 함수/분기 수준 설명 주석을 보강했다;
- 설정 파일과 운영 스크립트, E2E 테스트에도 실행 목적과 단계별 흐름이 드러나도록 한글 주석을 추가했다;

## 변경된 파일

- `src/app/(auth)/*.tsx`
- `src/app/(dashboard)/transactions/page.tsx`
- `src/app/(dashboard)/budget/page.tsx`
- `src/app/(dashboard)/statistics/page.tsx`
- `src/app/api/parse/route.ts`
- `src/components/assets/AccountList.tsx`
- `src/components/dashboard/DayTransactionSheet.tsx`
- `src/components/dashboard/MonthNavigator.tsx`
- `src/components/settings/CategoryManager.tsx`
- `src/components/statistics/CategoryRankingList.tsx`
- `src/components/transaction/*.tsx`
- `src/components/ui/*.tsx`
- `src/lib/auth-client.ts`
- `src/lib/utils.ts`
- `src/lib/utils.test.ts`
- `src/server/actions/account.ts`
- `src/server/actions/recurring.ts`
- `src/server/auth.ts`
- `src/server/db/index.ts`
- `src/server/db/reset.ts`
- `src/server/lib/__tests__/crypto.test.ts`
- `src/server/lib/__tests__/security.test.ts`
- `src/server/security/policy.ts`
- `src/types/index.ts`
- `next.config.ts`
- `capacitor.config.ts`
- `scripts/create-review-account.ts`
- `scripts/encrypt-existing-data.ts`
- `scripts/migrate-encrypt-accounts.ts`
- `e2e/account-parse-rematch.spec.ts`
- `docs/pipeline-state/2026-03-17-03-global-korean-comments.md`

## 결정 사항

- 전역 작업은 모든 파일에 같은 밀도의 주석을 강제하지 않고, 단순 파일에는 파일 헤더 중심, 복잡 파일에는 함수/분기 중심으로 밀도를 차등 적용했다;
- 호출 위치와 흐름 설명은 실제 import 경로나 라우트 진입점을 기준으로 적고, 의미가 빈약한 번역형 주석은 피했다;
- 사용자 요청에 맞춰 주석 언어는 한글로 통일하되, 코드 식별자와 경로는 영어 원문을 유지했다;

## 다음 할 일

- 이후 기능 수정이 들어가는 파일은 이번에 만든 파일 헤더와 함수 주석 톤을 기준으로 유지한다;
