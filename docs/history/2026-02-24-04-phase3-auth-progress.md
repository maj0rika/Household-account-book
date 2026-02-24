---
date: 2026-02-24
phase: 3
type: progress
---

# Phase 3 인증 진행

## 변경 내용
- Better Auth 의존성 추가 및 서버 설정 파일 구현
- Next.js App Router 인증 라우트(`/api/auth/[...all]`) 연결
- 이메일 로그인/회원가입 페이지 UI 구현
- Google 소셜 로그인 트리거 버튼 추가
- 보호 라우트 인증 미들웨어 추가
- Better Auth 테이블(`user`, `session`, `account`, `verification`) 스키마 추가 및 마이그레이션 반영

## 변경된 파일
- `src/server/auth.ts`
- `src/app/api/auth/[...all]/route.ts`
- `src/lib/auth-client.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `middleware.ts`
- `src/server/db/schema.ts`
- `src/server/db/migrations/0001_tiresome_roulette.sql`
- `src/server/db/migrations/meta/0001_snapshot.json`
- `src/server/db/migrations/meta/_journal.json`
- `.env.example`

## 결정 사항
- Google OAuth는 `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`가 있을 때만 활성화
- 인증 미들웨어는 세션 쿠키 존재 여부 기반으로 보호 라우트 접근을 제어

## 다음 할 일
- 실제 Google OAuth Redirect URI 등록 및 로그인 플로우 검증
- 인증 후 보호 페이지(대시보드/거래 목록) 연결
