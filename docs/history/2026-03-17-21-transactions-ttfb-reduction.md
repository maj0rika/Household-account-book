---
date: 2026-03-17
type: perf
---

# 거래 화면 초기 응답 지연 완화

## 변경 내용

- 인증 페이지 레이아웃을 클라이언트 세션 확인 스피너에서 서버 세션 리다이렉트로 바꿔 로그인된 사용자의 `/login`, `/register` 진입 지연을 줄였다;
- 로그인/회원가입 성공 후 `callbackURL`과 클라이언트 이동 경로를 `/transactions` 직행으로 통일해 `/` 경유 리다이렉트를 제거했다;
- 대시보드 레이아웃의 전역 입력 초기 데이터 조회를 별도 `Suspense` 경계 뒤로 보내 첫 HTML 바이트를 막지 않게 했다;
- 같은 요청 안에서 `getServerSession()` 결과를 재사용하도록 request-scoped cache를 추가했다;

## 변경된 파일

- `src/app/(auth)/layout.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/server/auth.ts`
- `docs/pipeline-state/2026-03-17-19-transactions-ttfb-reduction.md`

## 결정 사항

- `/login` 차단을 middleware 쿠키 판별로 옮기지 않고 서버 세션 검증으로 유지해 만료 쿠키 복구 경로를 깨지 않기로 했다;
- 전역 입력 바 초기값은 첫 페인트 이후에 준비돼도 되므로 `Suspense fallback={null}` 뒤로 분리해 TTFB 개선을 우선했다;
- 세션 조회 캐시는 요청 단위 재사용에만 쓰고, Route Handler용 `getRequestSession()` 경로는 그대로 유지했다;

## 다음 할 일

- 로그인된 상태 `/login` 재진입, 로그인 성공 직후 `/transactions`, 대시보드 cold load에서 입력 바 노출 시점을 브라우저에서 한 번 더 수동 확인한다;
