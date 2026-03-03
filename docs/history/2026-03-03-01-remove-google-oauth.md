---
date: 2026-03-03
type: remove
---

# Google OAuth 제거 — 이메일/비밀번호 인증만 유지

## 변경 내용

- Google OAuth 인증 코드 전면 제거 (커스텀 도메인 미사용으로 Google 검토 통과 불가)
- Better Auth 서버 설정에서 `socialProviders.google`, `accountLinking` 제거
- 로그인 페이지 Google 버튼 UI/핸들러 제거
- 회원가입 페이지 Google provider 분기 로직 제거
- 이메일 중복 확인 서버 액션 단순화 (Google provider 조회 제거)
- 환경변수 3개 제거 (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_GOOGLE_AUTH_ENABLED)

## 변경된 파일

- src/server/auth.ts
- src/app/(auth)/login/page.tsx
- src/app/(auth)/register/page.tsx
- src/server/actions/check-email.ts
- src/app/api/auth/[...all]/route.ts
- .env / .env.example

## 결정 사항

- Google OAuth 검토 시 커스텀 도메인 + 도메인 소유권 인증이 필수
- 커스텀 도메인 구매/연결 비용 대비 효용이 낮아 제거 결정
- 앱스토어 출시에는 커스텀 도메인 불필요 확인
