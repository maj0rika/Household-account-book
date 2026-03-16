# Auth/Parse 공개 입력 보안 하드닝

## PM 분석 결과

### 기능 요약
- Better Auth 인증 경로에 DB 기반 `rateLimit`을 활성화합니다;
- `/api/parse`에 Origin 검증, 입력 상한, 세션/유저/IP 단위 요청 제한을 추가합니다;
- 회원가입의 공개 이메일 존재 여부 노출을 제거하고 로그인/회원가입 오류 문구를 일반화합니다;
- 보안 이벤트와 앱 전용 rate limit 상태를 별도 테이블에 기록합니다;

### 수용 기준
- [x] 인증 경로에 DB 기반 rate limit이 적용됩니다;
- [x] `/api/parse`가 Origin 불일치, 비정상 입력, 과도한 요청을 LLM 호출 전에 차단합니다;
- [x] 회원가입에서 이메일 존재 여부가 클라이언트에 노출되지 않습니다;
- [x] raw 이메일/IP/User-Agent가 새 보안 저장소에 기록되지 않습니다;
- [x] 변경 사항이 `docs/history/`와 `docs/implementation-plan.md`에 기록됩니다;

### 활성 Phase
- PM;
- BE;
- FE;
- INFRA;
- REVIEW;
- QA;

### 스킵 Phase
- UXUI: 신규 화면이나 레이아웃 변경 없이 오류 문구와 보안 피드백만 조정합니다;
- DEPLOY: 사용자 요청이 없습니다;

### 승인 체크포인트
- 사용자 승인 완료: 2026-03-16 `PLEASE IMPLEMENT THIS PLAN`;
- REVIEW: 타입, 테스트, 빌드, diff 검증 후 PASS;
- QA: REVIEW PASS 이후 회귀 확인;

### Pipeline State 초기값
- 파일 경로: `docs/pipeline-state/2026-03-16-02-auth-parse-security-hardening.md`;
- 요청 요약: Auth/Parse 공개 입력 보안 하드닝;
- 현재 상태: DONE;
- 열린 이슈: 0개;

## Phase 상태

| Phase | 상태 | 메모 |
| --- | --- | --- |
| PM | PASS | 승인된 보안 플랜을 구현 범위로 고정 |
| BE | PASS | Better Auth rate limit, parse 보안 가드, 보안 이벤트/상태 저장소 추가 |
| FE | PASS | 로그인/회원가입 오류 문구 일반화, 공개 이메일 사전조회 제거 |
| INFRA | PASS | 수동 마이그레이션, Vitest 설정, reset 대상 갱신 |
| REVIEW | PASS | `npx tsc --noEmit`, `npm test`, `npm run build` 통과 |
| QA | PASS | 정상 입력 회귀 + 비정상 입력/과요청 차단 코드 경로 확인 |
| UXUI | SKIPPED | 신규 상호작용 설계 없음 |
| DEPLOY | SKIPPED | 사용자 미요청 |

## 승인 이력

- 2026-03-16: 사용자 승인 `PLEASE IMPLEMENT THIS PLAN`;

## 리뷰 이슈

- 없음;

## BE/FE 변경 패킷

### 변경 파일
- `src/server/auth.ts`;
- `src/app/api/auth/[...all]/route.ts`;
- `src/app/api/parse/route.ts`;
- `src/server/security/index.ts`;
- `src/server/security/policy.ts`;
- `src/server/db/schema.ts`;
- `src/server/db/migrations/0008_auth-parse-security-hardening.sql`;
- `src/app/(auth)/login/page.tsx`;
- `src/app/(auth)/register/page.tsx`;
- `vitest.config.ts`;

### 핵심 로직
- Better Auth에 `rateLimit.storage = 'database'`와 `/sign-in/email`, `/sign-up/email` 커스텀 규칙을 추가했습니다;
- 세션 `ipAddress`와 `userAgent`는 DB 저장 전 해시로 최소화했습니다;
- `/api/parse`는 Origin 검증, 텍스트 길이/줄수/base64 패턴 검사, 이미지 MIME/크기/base64 상한 검사를 추가했습니다;
- parse 요청은 유저 일반 한도, 이미지 세션 한도, IP 비정상 접근 한도로 분리했습니다;
- 회원가입 사전 이메일 조회를 제거하고, 로그인/회원가입 오류 문구를 일반화했습니다;

### 검증 결과
- `npx tsc --noEmit`: PASS;
- `npm test`: PASS;
- `npm run build`: PASS;

## PM 최종 재검증

### 비교 결과
- 요청 대비 구현: 일치;
- 승인 범위 준수: 예;
- 기록 문서 반영: 예;

### 남은 리스크
- 새 `rateLimit`, `security_rate_limits`, `security_events` 테이블은 배포 전 DB 마이그레이션이 선행되어야 합니다;
- Better Auth 세션 메타데이터는 해시 저장으로 전환되어, 운영 중 원문 IP/User-Agent 확인은 불가능합니다;

### 판정
- PASS;
