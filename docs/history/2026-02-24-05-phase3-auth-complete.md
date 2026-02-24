---
date: 2026-02-24
phase: 3
type: complete
---

# Phase 3 인증 완료

## 변경 내용
- Better Auth 서버 설정에 Drizzle 스키마 매핑 추가 (핵심 수정)
- `BETTER_AUTH_SECRET` 생성 (hex 형식, 특수문자 회피)
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_BETTER_AUTH_URL` 환경변수 추가
- 회원가입 → 로그인 → 세션 쿠키 발급 플로우 검증 완료

## 수정된 파일
- `src/server/auth.ts` — drizzleAdapter에 스키마 매핑 추가
- `.env` — BETTER_AUTH_SECRET, BETTER_AUTH_URL 설정

## 해결한 이슈

### 1. "Bad escaped character in JSON" 에러
- **증상**: 회원가입 시 500 에러, JSON 파싱 실패
- **원인**: drizzleAdapter에 스키마를 전달하지 않아 `user` 모델을 찾지 못함
- **해결**: `schema` 옵션에 `authUsers`, `authSessions`, `authAccounts`, `authVerifications` 매핑

### 2. BETTER_AUTH_SECRET 특수문자 문제
- **증상**: Base64 인코딩된 시크릿의 `+` 문자가 JSON 파싱 간섭
- **해결**: `openssl rand -hex 32`로 hex 형식 시크릿 사용

## 검증된 기능
- [x] 이메일 회원가입 (POST /api/auth/sign-up/email)
- [x] 이메일 로그인 (POST /api/auth/sign-in/email)
- [x] 세션 쿠키 발급 (better-auth.session_token)
- [x] 인증 상태 확인 (GET /api/auth/ok)
- [x] 미들웨어 보호 라우트 (/transactions, /categories 등)
- [x] 로그인 페이지 UI
- [x] 회원가입 페이지 UI
- [ ] Google 소셜 로그인 (GOOGLE_CLIENT_ID 미설정 — 추후)

## 다음 할 일
- Phase 4: LLM 파서 (핵심 기능) — TransactionParser 인터페이스 + OpenAI/KIMI 구현체
