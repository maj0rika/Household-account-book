---
date: 2026-03-16
type: fix
---

# Auth/Parse 공개 입력 보안 하드닝

## 변경 내용

- Better Auth 인증 경로에 DB 기반 `rateLimit`과 프록시 IP 헤더 설정을 추가했다;
- 세션 `ipAddress`, `userAgent`를 저장 전 해시 처리해 raw 메타데이터 보관을 중단했다;
- `/api/parse`에 Origin 검증, 텍스트/이미지 입력 상한, 유저·세션·IP 단위 rate limit을 추가했다;
- `security_rate_limits`, `security_events`, Better Auth용 `rateLimit` 테이블 마이그레이션을 추가했다;
- 회원가입의 공개 이메일 사전조회 액션을 제거하고 로그인/회원가입 오류 문구를 일반화했다;
- Vitest 설정을 추가해 `e2e/` Playwright 스펙이 `npm test`에 섞이지 않도록 정리했다;

## 변경된 파일

- `src/server/auth.ts`;
- `src/app/api/auth/[...all]/route.ts`;
- `src/app/api/parse/route.ts`;
- `src/server/security/index.ts`;
- `src/server/security/policy.ts`;
- `src/server/db/schema.ts`;
- `src/server/db/migrations/0008_auth-parse-security-hardening.sql`;
- `src/server/db/migrations/meta/_journal.json`;
- `src/server/db/reset.ts`;
- `src/app/(auth)/login/page.tsx`;
- `src/app/(auth)/register/page.tsx`;
- `src/lib/auth-errors.ts`;
- `src/server/lib/__tests__/security.test.ts`;
- `vitest.config.ts`;

## 결정 사항

- 인증 rate limit은 Better Auth 내장 기능을 DB 저장소로 활성화해 분산 환경에서도 일관되게 동작하게 했다;
- 앱 전용 parse/public 보호는 Better Auth 테이블과 분리된 `security_rate_limits`, `security_events`로 운영해 공개 입력 방어와 감사 로그를 분리했다;
- `authUsers.email`은 Better Auth 조회/고유성 제약 때문에 암호화하지 않고, 클라이언트 선조회 제거와 메시지 일반화로 정보 노출을 줄였다;
- raw IP/User-Agent는 새 보안 저장소에 남기지 않고 HMAC 해시로 최소화했다;

## 다음 할 일

- 배포 전에 `0008_auth-parse-security-hardening.sql`을 적용한다;
- 운영 환경에서 인증/파싱 한도가 실제 사용 패턴에 맞는지 로그를 보고 조정한다;
