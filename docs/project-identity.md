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

### 2) Google OAuth (선택)

1. Google Cloud Console에서 OAuth Client를 생성한다.
2. `.env.local`에 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`을 입력한다.
3. 인증 기능 구현 단계(Phase 3)에서 사용한다.

공식 문서:

- https://developers.google.com/workspace/guides/create-credentials

### 3) KIMI 키 (선택)

1. KIMI 제공 콘솔에서 API Key를 발급받는다.
2. `.env.local`에 `KIMI_API_KEY`를 입력한다.
3. 프로바이더 전환 시 `LLM_PROVIDER=kimi`로 변경한다.

참고: KIMI 콘솔에서 발급받은 서버용 키만 사용한다.

### 4) Fireworks 키 (선택)

1. Fireworks 제공 콘솔에서 API Key를 발급받는다.
2. `.env.local`에 `FIREWORKS_API_KEY`를 입력한다.
3. 우선순위에 따라 `LLM_PROVIDER=fireworks`로 자동 적용될 수 있다.

## .env.local 템플릿

`.env.example`을 복사해서 사용한다.

```bash
cp .env.example .env.local
```

## 최소 로컬 검증 루틴

```bash
npm run lint
npm test
npm run build
```

위 3개가 통과하면 로컬 테스트 가능 상태로 본다.
