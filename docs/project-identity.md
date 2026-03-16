# 프로젝트 아이덴티티 (Project Identity)

## 역할 정의

이 프로젝트에서 에이전트의 역할은 기능 구현만이 아니다.

1. `docs/implementation-plan.md` 기준으로 기능을 구현한다.
2. 사용자가 직접 테스트 가능한 수준까지 환경 구성을 안내한다.
3. DB/ENV/API 키 발급 경로와 입력 위치를 명확히 안내한다.

## 테스트 가능 환경 구성 책임 범위

아래 항목은 기능 개발과 동일한 중요도로 다룬다.

- 로컬 실행에 필요한 `.env.local` 키 목록 제공
- DB 연결 문자열(`DATABASE_URL`) 발급/설정 가이드
- 외부 API 키 발급 경로 안내
- 마이그레이션/시드 실행 절차 안내
- 최소 검증 명령(`lint`, `test`, `build`) 안내

## 사용자 준비 항목 (필수 전달값)

아래 값은 사용자가 발급 후 `.env.local`에 채워서 전달해야 한다.

- `DATABASE_URL`: Supabase Postgres 연결 문자열
- `KIMI_API_KEY`: KIMI 사용 시
- `FIREWORKS_API_KEY`: Fireworks 사용 시
- `MINIMAX_API_KEY`: MiniMax 사용 시 (100자 이하 짧은 텍스트 우선 경로)

## 실전 셋업 가이드

### 1) Supabase DB 설정

1. Supabase에서 프로젝트를 생성한다.
2. Supabase Dashboard → Project Settings → Database에서 연결 문자열을 확인한다.
3. `.env.local`에 `DATABASE_URL` 값을 입력한다.
4. 아래 명령으로 스키마를 반영한다.

```bash
npm run db:migrate
npm run db:seed
```

공식 문서:

- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/api/api-keys

### 2) Better Auth 이메일/비밀번호 인증

이 프로젝트의 현재 인증 방식은 **이메일/비밀번호만** 사용한다.;

1. `.env.local`에 `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`을 입력한다.;
2. 회원가입/로그인 화면은 Better Auth의 credential provider를 사용한다.;
3. Google OAuth는 제거되었으므로 별도 Client ID 발급이 필요하지 않다.;
4. 인증 경로는 DB 기반 `rateLimit`를 사용하므로 마이그레이션 누락 시 인증 요청이 실패할 수 있다.;

### 2-1) Auth/Parse 보안 하드닝 반영 사항

- `0008_auth-parse-security-hardening.sql` 적용 전에는 최신 인증/파싱 경로를 운영 환경에서 사용하지 않는다.;
- `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`은 실제 요청 Origin과 일치해야 한다.;
- `/api/parse`는 Origin 검증과 입력 상한을 사용하므로, 외부 자동화/테스트도 같은 Origin 기준을 따라야 한다.;
- 세부 정책은 `docs/security-hardening.md`를 기준 문서로 사용한다.;

### 3) KIMI 키 (선택)

1. KIMI 제공 콘솔에서 API Key를 발급받는다.
2. `.env.local`에 `KIMI_API_KEY`를 입력한다.
3. 프로바이더 전환 시 `LLM_PROVIDER=kimi`로 변경한다.

참고: KIMI 콘솔에서 발급받은 서버용 키만 사용한다.

### 4) Fireworks 키 (선택)

1. Fireworks 제공 콘솔에서 API Key를 발급받는다.
2. `.env.local`에 `FIREWORKS_API_KEY`를 입력한다.
3. 우선순위에 따라 `LLM_PROVIDER=fireworks`로 자동 적용될 수 있다.

### 5) MiniMax 키 (선택)

1. MiniMax 제공 콘솔에서 API Key를 발급받는다.
2. `.env.local`에 `MINIMAX_API_KEY`를 입력한다.
3. 100자 이하 짧은 텍스트 입력은 MiniMax를 1순위로 사용하고, 실패 시 Fireworks로 폴백한다.
4. 긴 텍스트/복수 거래는 기존 Kimi 경로를 유지한다.
5. 이미지 입력은 기존처럼 Fireworks 우선, 3회 초과 시 Kimi로 전환된다.

## .env.local 템플릿

`.env.example`을 복사해서 사용한다.

```bash
cp .env.example .env.local
```

## 최소 로컬 검증 루틴

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

위 4개가 통과하면 로컬 테스트 가능 상태로 본다.
