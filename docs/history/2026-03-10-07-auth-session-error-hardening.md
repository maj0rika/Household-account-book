---
date: 2026-03-10
type: fix
---

# 인증 세션 조회 실패 복구 경로 보강

## 변경 내용

- Better Auth 세션 조회가 예외를 던질 때 서버 컴포넌트와 서버 액션이 이를 인증 실패로 안전하게 처리하도록 공통 헬퍼를 추가한다.
- 보호 레이아웃과 루트 진입점에서 세션 조회 실패 시 서버 에러를 노출하지 않고 로그인 화면으로 복구한다.
- `/login`, `/register`는 세션 쿠키 존재만으로 차단하지 않도록 미들웨어를 조정해, 만료되거나 깨진 쿠키가 남아 있어도 재로그인이 가능하게 한다.

## 변경된 파일

- docs/history/2026-03-10-07-auth-session-error-hardening.md
- docs/implementation-plan.md
- middleware.ts
- src/server/auth.ts
- src/app/page.tsx
- src/app/(dashboard)/layout.tsx
- src/app/(dashboard)/settings/page.tsx
- src/app/(auth)/layout.tsx
- src/server/actions/account.ts
- src/server/actions/budget.ts
- src/server/actions/parse-unified.ts
- src/server/actions/recurring.ts
- src/server/actions/settings.ts
- src/server/actions/statistics.ts
- src/server/actions/transaction.ts
- src/app/api/parse/route.ts

## 결정 사항

- 깨진 세션 토큰은 "서버 예외"보다 "로그인 만료"에 가깝게 처리하는 편이 사용자 복구 경로와 보안 모델 모두에 적합하다.
- 인증 페이지 리다이렉트는 실제 세션 검증 결과로만 판단하고, 미들웨어에서는 보호 경로 1차 차단만 유지한다.

## 다음 할 일

- 만료 쿠키가 남아 있는 상태에서 `/transactions`, `/login`, 파싱 요청을 각각 열어 로그인 복구가 자연스럽게 동작하는지 수동 점검한다.
