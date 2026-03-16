# Auth/Parse 보안 하드닝 요약

## 목적

이 문서는 2026-03-16 기준 `Auth + Parse + 공개입력` 보안 하드닝 결과를 운영/개발 관점에서 빠르게 확인하기 위한 요약 문서입니다;

## 적용 범위

- Better Auth 이메일/비밀번호 인증 경로;
- `/api/auth/[...all]` 인증 API 진입점;
- `/api/parse` 텍스트/이미지 파싱 API;
- 로그인/회원가입 클라이언트 오류 처리;
- 보안 이벤트와 앱 전용 rate limit 저장소;

## 현재 보안 정책

### 인증 경로

- Better Auth `rateLimit`를 `database` 저장소로 활성화했습니다;
- `/sign-in/email` 기본 한도: `10분 / 5회`;
- `/sign-up/email` 기본 한도: `60분 / 5회`;
- 세션 `ipAddress`, `userAgent`는 DB 저장 전 해시 처리합니다;
- 인증 실패 응답은 계정 존재 여부를 드러내지 않는 일반 문구로 통일합니다;

### 파싱 경로

- Origin/Referer가 신뢰된 출처와 일치하지 않으면 차단합니다;
- 텍스트 입력 상한:
  - 최대 `3000자`;
  - 최대 `40줄`;
  - 제어문자/널문자 제거;
  - base64 payload만 들어온 비정상 텍스트 차단;
- 이미지 입력 상한:
  - 허용 MIME: `image/jpeg`, `image/png`, `image/webp`, `image/gif`;
  - 원본 파일 최대 `8MB`;
  - base64 payload 최대 약 `3MB`;
- parse rate limit:
  - 유저 기준 일반 parse: `5분 / 20회`;
  - 세션 기준 이미지 parse: `10분 / 6회`;
  - 인증 없는 비정상 접근 IP: `10분 / 10회`;
  - 연속 차단 누적 시 `15분 block`;

## 저장소 구조

### Better Auth 전용

- `rateLimit`: Better Auth 내장 인증 rate limit 상태 저장;

### 앱 전용

- `security_rate_limits`: parse/public 보호용 앱 전용 rate limit 상태;
- `security_events`: `throttled`, `invalid_input`, `origin_mismatch`, `suspicious_pattern`, `unauthorized` 이벤트를 기록하고, anomaly 차단 여부는 `metadata.blocked`로 남깁니다;

## 데이터 최소화 원칙

- raw 이메일, raw IP, raw User-Agent는 새 보안 저장소에 기록하지 않습니다;
- 식별자는 HMAC 해시값만 저장합니다;
- 보안 이벤트 `metadata`에는 길이, MIME, retry-after 같은 최소 운영 메타데이터만 저장합니다;
- `authUsers.email`은 Better Auth 로그인 식별자 제약 때문에 암호화하지 않으며, 대신 공개 노출을 UI/응답 수준에서 줄입니다;

## 운영 체크리스트

### 로컬/배포 전

1. `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`이 모두 설정되어 있어야 합니다;
2. DB에 `0008_auth-parse-security-hardening.sql`이 적용되어 있어야 합니다;
3. 검증 명령:

```bash
npx tsc --noEmit
npm test
npm run build
```

### 운영 중

- `security_events`에서 `origin_mismatch`, `unauthorized`, `suspicious_pattern`, `invalid_input`, `throttled` 비율과 `metadata.blocked=true` 누적을 함께 점검합니다;
- 정상 사용자가 과도하게 429를 받는 경우 `security_rate_limits` 누적 패턴을 보고 한도를 조정합니다;
- IP/User-Agent 원문이 아닌 해시만 남으므로, 상세 원문 추적이 필요하면 별도 인프라 로그를 사용합니다;

## 관련 파일

- `src/server/auth.ts`;
- `src/app/api/auth/[...all]/route.ts`;
- `src/app/api/parse/route.ts`;
- `src/server/security/index.ts`;
- `src/server/security/policy.ts`;
- `src/server/db/schema.ts`;
- `src/server/db/migrations/0008_auth-parse-security-hardening.sql`;

## 관련 기록

- `docs/history/2026-03-16-02-auth-parse-security-hardening.md`;
- `docs/pipeline-state/2026-03-16-02-auth-parse-security-hardening.md`;
