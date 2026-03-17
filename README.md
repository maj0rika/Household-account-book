# 가계부 (Household Account Book)

AI 자연어 입력과 이미지/은행 알림 파싱을 이용해 거래를 기록하는 모바일 퍼스트 가계부 앱입니다. 현재 웹 앱과 Capacitor 기반 네이티브 셸을 함께 운영하며, 거래 관리, 통계, 예산, 자산/부채 추적까지 한 흐름으로 제공합니다;

## 현재 구현 상태

- 이메일/비밀번호 기반 인증;
- 자연어 거래 입력, 은행 알림 메시지 배치 파싱, 이미지 기반 거래 파싱;
- 거래 목록, 필터 검색, 고정 거래 관리;
- 월간 대시보드, 통계, 예산 관리;
- 자산/부채 계정 관리와 순자산 요약;
- 설정 페이지, 카테고리 관리, 프로필/테마/계정 삭제;
- Capacitor iOS/Android 셸 연동과 Android 릴리스 빌드;

## 아직 남아 있는 작업

- N분의 1 정산 Phase 14;
- 예산 알림;
- 음성 입력과 OCR 고도화;
- 자산/부채 외부 API 연동;
- 앱스토어 제출 마무리;

## 기술 스택

- `Next.js 15` + `React 19` + `TypeScript`;
- `Tailwind CSS 4` + `shadcn/ui` + `Recharts` + `Vaul` + `motion`;
- `Supabase Postgres` + `Drizzle ORM`;
- `Better Auth` (이메일/비밀번호만 사용);
- `OpenAI` 호환 LLM 라우팅 기반 `Kimi`, `Fireworks`, `MiniMax`;
- `Capacitor 8` iOS / Android;

## 주요 도메인

- 거래(`transactions`)와 카테고리(`categories`);
- 고정 거래(`recurring_transactions`)와 예산(`budgets`);
- 자산/부채 계정(`accounts`);
- Better Auth 세션/계정 테이블;

## 보안 요약

- Better Auth 인증 경로는 DB 기반 `rateLimit`로 보호됩니다;
- `/api/parse`는 Origin 검증, 텍스트/이미지 입력 상한, 유저/세션/IP 기준 요청 제한을 적용합니다;
- 세션 `ipAddress`, `userAgent`는 raw 값 대신 해시로 최소화 저장합니다;
- 상세 운영 정책은 `docs/security-hardening.md`를 참고합니다;

## 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 파일 준비

```bash
cp .env.example .env.local
```

`.env.local`에 아래 필수 값을 채웁니다;

### 3. DB 초기화

```bash
npm run db:init
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 됩니다;

## 환경변수

| 변수                          | 필요 여부 | 설명                                                |
| ----------------------------- | --------- | --------------------------------------------------- |
| `DATABASE_URL`                | 필수      | Supabase Postgres 연결 문자열;                      |
| `BETTER_AUTH_SECRET`          | 필수      | Better Auth 세션 서명 키;                           |
| `BETTER_AUTH_URL`             | 필수      | 서버 기준 인증 URL, 로컬은 `http://localhost:3000`; |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | 필수      | 클라이언트 기준 인증 URL;                           |
| `LLM_PROVIDER`                | 선택      | 기본 provider 선택값, 현재 `kimi` 기본;             |
| `KIMI_API_KEY`                | 선택      | 긴 텍스트/복수 거래 파싱 경로;                      |
| `FIREWORKS_API_KEY`           | 선택      | 이미지 파싱 우선 경로;                              |
| `MINIMAX_API_KEY`             | 선택      | 100자 이하 짧은 텍스트 우선 경로;                   |
| `ENCRYPTION_KEY`              | 권장      | 자산/부채 민감 필드 암호화용 64자리 hex 키;         |
| `NEXT_PUBLIC_API_URL`         | 선택      | 외부 API base URL 지정 시 사용;                     |
| `REVIEW_ACCOUNT_EMAIL`        | 선택      | Google Play 리뷰 계정 이메일;                       |
| `REVIEW_ACCOUNT_NAME`         | 선택      | Google Play 리뷰 계정 이름;                         |
| `REVIEW_ACCOUNT_PASSWORD`     | 선택      | Google Play 리뷰 계정 비밀번호;                     |

LLM 파싱을 실제로 쓰려면 `KIMI_API_KEY`, `FIREWORKS_API_KEY`, `MINIMAX_API_KEY` 중 최소 하나 이상은 준비하는 편이 안전합니다;

## 주요 스크립트

### 개발/검증

```bash
npm run dev
npm run lint
npm test
npm run build
npm run test:e2e:install
npm run test:e2e
```

### DB

```bash
npm run db:generate
npm run db:migrate
npm run db:seed:create
npm run db:seed
npm run db:seed:user -- --email you@example.com
npm run db:reset
npm run db:init
npm run db:encrypt-existing
```

### Capacitor

```bash
npm run cap:sync
npm run cap:open:ios
npm run cap:open:android
npm run cap:run:ios
npm run cap:run:android
```

`Capacitor`는 정적 export가 아니라 배포된 Vercel URL을 WebView로 불러오는 방식입니다;

## 프로젝트 구조

```text
src/app                Next.js App Router 페이지와 API Route
src/components         대시보드, 거래, 자산, 통계, 설정 UI
src/server             DB, Server Actions, LLM, 서비스 로직
docs                   구현 계획, 디자인 시스템, 히스토리, 파이프라인 상태
android / ios          Capacitor 네이티브 프로젝트
e2e                    Playwright E2E 테스트
```

## 관련 문서

- `docs/implementation-plan.md`: 단일 기준 계획 문서, 통합 backlog, 히스토리 인덱스;
- `docs/design-system.md`: UI 기준과 컴포넌트 규칙;
- `docs/code-quality.md`: 코드 품질 가이드;
- `docs/project-identity.md`: 환경변수와 로컬 셋업 책임 범위;
- `docs/security-hardening.md`: Auth/Parse 공개 입력 보안 정책과 운영 체크리스트;
- `docs/history/`: 변경 기록;

## 참고

- 현재 인증은 이메일/비밀번호만 지원합니다;
- 네이티브 앱 셸은 `capacitor.config.ts`의 Vercel URL을 사용합니다;
- 루트 AI 작업 규칙과 문서 기록 규칙은 `AGENTS.md`를 따릅니다;
