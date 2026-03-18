# 구현 계획서

이 문서는 현재 저장소의 구현 방향과 변경 이력을 간단히 추적하기 위한 공개용 인덱스다.

## 현재 구현 요약

- 프레임워크: `Next.js 15` + `React 19` + `TypeScript`;
- 핵심 기능: 거래 입력/파싱, 통계, 예산, 자산/부채, 설정, Better Auth 기반 인증;
- 네이티브 확장: `Capacitor 8` iOS / Android 셸;

## Phase 로드맵

### Phase 1. 환경 분리 기준선 정리

- 현재 단일 환경으로 묶여 있는 `DB`, `server`, `env` 의존성을 목록화한다;
- 분리 대상 범위를 `Supabase project`, `Drizzle migration`, `Better Auth`, 배포 URL, 비밀값으로 확정한다;
- `dev`와 `prod`가 서로의 데이터와 자격 증명을 참조하지 않도록 원칙을 문서화한다;

### Phase 2. `dev DB` 분리

- 개발용 `Supabase` 프로젝트와 데이터베이스를 별도로 준비한다;
- 로컬과 개발 서버가 `dev DB`만 바라보도록 환경변수 매핑을 정리한다;
- 마이그레이션, 시드, 테스트 데이터 초기화 절차를 개발 환경 기준으로 분리한다;

### Phase 3. `prod DB` 분리

- 운영용 `Supabase` 프로젝트와 데이터베이스를 개발 환경과 완전히 분리한다;
- 운영 마이그레이션 승인 절차, 백업, 롤백 기준을 정의한다;
- 운영 비밀값과 접근 권한을 개발 환경과 독립적으로 관리한다;

### Phase 4. `dev server` 분리

- 개발 또는 preview 서버의 배포 대상, URL, 로그 수집 경로를 분리한다;
- `dev server`가 `dev DB`와 개발용 인증 설정만 사용하도록 연결 규칙을 고정한다;
- 개발 서버 전용 환경변수와 배포 체크리스트를 정리한다;

### Phase 5. `prod server` 분리

- 운영 서버의 배포 대상, 도메인, 모니터링, 비밀값 주입 경로를 독립적으로 관리한다;
- `prod server`가 `prod DB` 외 다른 데이터 원본에 접근하지 않도록 차단 규칙을 둔다;
- 배포 승인, smoke check, 장애 시 롤백 절차를 운영 환경 기준으로 문서화한다;

### Phase 6. 운영 검증과 전환

- 환경별 설정 매트릭스와 점검표를 만들어 누락된 연결을 확인한다;
- 인증 콜백 URL, CORS, 스토리지, 스케줄 작업이 환경별로 분리되었는지 검증한다;
- 실제 분리 작업 착수 전에 체크해야 할 선행 조건과 후속 작업을 backlog로 남긴다;

## UX 개선 backlog

### 거래내역/통계 간 월 요약 상태 유지

- 거래내역과 통계 화면이 공통으로 사용하는 월 요약 세션은 화면 이동 시 초기화하지 않고 재사용한다;
- 월 선택값, 요약 데이터, 로딩 상태를 상위 route 범위 또는 공용 캐시에 유지해 불필요한 재렌더링과 재요청을 줄인다;
- 화면 전환 직후에는 직전 월 요약 결과를 즉시 보여주고, 실제 갱신이 필요할 때만 background refresh를 검토한다;
- 이 backlog 범위는 거래내역과 통계 사이의 월 요약 상태 유지로 제한하고, 다른 화면의 전역 상태 확장으로 번지지 않게 관리한다;
- 구현 전 검토 후보는 `layout/provider` 기반 상태 보존과 query cache 재사용 두 가지로 한정한다;

## LLM 관측성 backlog

### provider 경쟁 실패 로그 정교화

- `first-success-wins` 방식의 LLM 경쟁 처리에서는 각 요청마다 `parseRequestId`를 부여해 승자와 패자 시도를 같은 묶음으로 추적한다;
- provider별 로그에는 `provider`, `model`, `timeoutMs`, `elapsedMs`, `result`, `errorName`, `errorMessage`, `errorCode`, `httpStatus`, `abortReason`을 구조화해 남긴다;
- 실패한 쿼리는 raw 입력 전체를 기본 저장하지 않고 `inputHash`와 비식별화된 `inputPreview`만 남겨 개인정보 노출을 막는다;
- 모든 provider가 실패한 경우에는 개별 실패 로그와 별도로 aggregate 실패 로그를 남겨 어떤 provider가 어떤 이유로 탈락했는지 한 번에 확인할 수 있게 한다;
- debug 플래그가 활성화된 제한된 환경에서만 raw prompt 또는 원문 입력을 선택적으로 기록하고, 운영 기본값은 비저장으로 둔다;

## 보안 강화 backlog

### 웹 보안 헤더 명시

- `next.config.ts`의 캐시 헤더 외에 `CSP`, `HSTS`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`를 명시적으로 추가하는 작업을 backlog로 관리한다;
- 쿠키 탈취의 전 단계가 되는 `XSS`, 클릭재킹, 프로토콜 다운그레이드 위험을 줄이기 위해 최소 헤더 기준선을 저장소 차원에서 고정한다;
- 운영/preview/local 환경별 허용 출처와 예외 정책을 분리해 `CSP`가 과도하게 느슨해지지 않도록 검토한다;

### 세션 쿠키 정책 명시 검증

- `src/server/auth.ts`의 Better Auth 설정이 라이브러리 기본값에만 기대지 않도록 `Secure`, `HttpOnly`, `SameSite`, domain 정책을 명시 검증 대상으로 문서화한다;
- 코드 설정과 운영 문서가 같은 기준을 보도록 환경별 쿠키 정책 표를 유지하고, 배포 전 점검 항목으로 포함한다;
- 세션 쿠키 정책이 잘못 바뀌면 바로 감지할 수 있도록 설정 단위 점검 또는 테스트 가능성도 함께 검토한다;

### 세션 탈취 대응 강화

- 현재 비식별 `IP`/`UA` 저장을 넘어 이상 징후 기반 재인증, 세션 강제 폐기, 최근 로그인/세션 관리 UX를 backlog에 추가한다;
- `src/server/auth.ts`, `src/server/security/policy.ts` 기준으로 세션 위험 신호를 언제 탐지하고 어떤 수준에서 차단할지 운영 규칙을 정리한다;
- 계정 보안 이벤트 발생 시 사용자에게 최근 로그인과 활성 세션을 확인·종료할 수 있는 흐름을 제공하는 방향을 검토한다;

### DB 방어 안전망 확장

- 현재 `RLS` 활성화가 `service_role` 우회 전제를 깔고 있는 만큼, 장기적으로 최소권한 `DB` 계정 분리와 정책 기반 `RLS` 강화 작업을 backlog에 추가한다;
- 서버 코드 검증에만 의존하지 않도록, 데이터 계층 자체에서 오용·오권한 접근을 줄이는 방향으로 안전망을 설계한다;
- 우선순위는 `service_role` 사용 범위 축소, 읽기/쓰기 역할 분리, 실제 정책 기반 `RLS` 전환 검토 순으로 둔다;

## 거래-계좌 연동 backlog

### 거래-계좌 완전 연동

- 현재 구조는 `accountId`가 연결된 거래만 계좌 잔액과 연동된다는 전제를 문서화하고, 모든 거래 경로를 계좌 기준으로 일관되게 맞추는 작업을 backlog로 관리한다;
- 수동 입력, 일반 수정/삭제, 파싱 결과 저장처럼 이미 연동되는 경로와 `accountId` 미선택 거래, 고정거래(`recurring`)처럼 누락 가능성이 있는 경로를 구분해 정합성 점검 기준을 만든다;
- 특히 `recurring` 생성·저장 경로에서 `accountId` 전달과 잔액 반영이 빠질 수 있는 부분을 우선 보완 대상으로 둔다;
- 장기적으로는 거래 생성, 수정, 삭제, 일괄 저장, 반복 생성 전 경로가 같은 계좌 잔액 규칙을 따르도록 서버 로직을 통합한다;
- 파싱 기반 입력에서도 계좌 연결이 선택사항으로 남아 자산 반영이 누락되지 않도록 계좌 선택 UX, 기본 계좌 정책, 후처리 검증을 함께 검토한다;

## 히스토리 로그

| 날짜 | 항목 | 유형 |
| --- | --- | --- |
| 2026-03-18 | [GitHub Quality 액션 제거](./history/2026-03-18-32-remove-quality-action.md) | remove |
| 2026-03-18 | [변경사항 학습·면접 준비 문서 추가](./history/2026-03-18-31-change-interview-study-doc.md) | docs |
| 2026-03-18 | [워크트리 변경사항 이해 문서 추가](./history/2026-03-18-30-working-tree-overview-doc.md) | docs |
| 2026-03-18 | [거래 화면 Lighthouse 접근성·초기 JS 보정](./history/2026-03-18-29-transactions-lighthouse-remediation.md) | fix |
| 2026-03-18 | [최근 변경 파일 주석 보강](./history/2026-03-18-27-commentary-refresh.md) | docs |
| 2026-03-18 | [요청 origin 기준 메타데이터 정렬](./history/2026-03-18-26-request-origin-metadata-fix.md) | fix |
| 2026-03-18 | [Next build backup 폴더 정리 규칙 추가](./history/2026-03-18-25-next-backup-ignore-cleanup.md) | config |
| 2026-03-18 | [통계 랭킹 서버 렌더링과 차트 링크 단순화](./history/2026-03-18-24-statistics-ranking-server-render.md) | perf |
| 2026-03-18 | [거래 화면 시트 지연 로딩과 모션 경량화](./history/2026-03-18-23-transactions-sheet-motion-trim.md) | perf |
| 2026-03-18 | [통계와 거래 화면 성능 구조 조정](./history/2026-03-18-22-statistics-transactions-perf-structure.md) | perf |
| 2026-03-18 | [늦은 섹션 하이드레이션 경량화](./history/2026-03-18-21-late-section-hydration-tuning.md) | perf |
| 2026-03-18 | [모달 blur 제거와 focus trap 적용](./history/2026-03-18-20-modal-focus-trap.md) | fix |
| 2026-03-18 | [달력 키보드 탐색과 성능 재측정](./history/2026-03-18-19-calendar-performance-followup.md) | fix |
| 2026-03-18 | [웹 접근성 P1 후속 보정](./history/2026-03-18-18-audit-p1-followup-fix.md) | fix |
| 2026-03-18 | [auth 대비와 호환성 1차 보정](./history/2026-03-18-17-auth-contrast-compat-fix.md) | fix |
| 2026-03-18 | [내비게이션과 예외 화면 시맨틱 보강](./history/2026-03-18-16-navigation-exception-semantic-fix.md) | fix |
| 2026-03-18 | [차트와 달력 접근성 1차 보강](./history/2026-03-18-15-chart-calendar-a11y-fix.md) | fix |
| 2026-03-18 | [폼 입력 접근성 1차 보정](./history/2026-03-18-15-form-accessibility-fix.md) | fix |
| 2026-03-18 | [프론트엔드 스킬과 ESLint 품질 게이트 보강](./history/2026-03-18-14-skill-quality-gates.md) | config |
| 2026-03-18 | [면접 문서에 웹표준·접근성·상태관리 치트시트 보강](./history/2026-03-18-13-interview-web-standards-expansion.md) | docs |
| 2026-03-18 | [웹표준·접근성·SEO 면접 문서 분리 재구성](./history/2026-03-18-12-interview-seo-accessibility-reframe.md) | docs |
| 2026-03-18 | [거래-계좌 연동 backlog 추가](./history/2026-03-18-10-transaction-account-link-backlog.md) | docs |
| 2026-03-18 | [보안 강화 backlog 추가](./history/2026-03-18-09-security-hardening-backlog.md) | docs |
| 2026-03-18 | [LLM 텍스트 race를 Promise.any로 전환](./history/2026-03-18-08-llm-promise-any-migration.md) | refactor |
| 2026-03-18 | [LLM 실패 로그 backlog 추가](./history/2026-03-18-07-llm-failure-log-backlog.md) | docs |
| 2026-03-18 | [월 요약 상태 유지 UX backlog 추가](./history/2026-03-18-06-month-summary-ux-backlog.md) | docs |
| 2026-03-18 | [구현 계획서에 환경 분리 페이즈 추가](./history/2026-03-18-02-env-separation-phase-plan.md) | docs |
| 2026-03-17 | [거래 화면 최적화 면접 설명 문서 작성](./history/2026-03-17-24-interview-optimization-summary.md) | docs |
| 2026-03-17 | [공개 저장소용 내부 문서 추적 해제](./history/2026-03-17-25-public-doc-pruning.md) | docs |
| 2026-03-17 | [모바일 비동기 파싱 위젯 개선안 backlog 추가](./history/2026-03-17-26-mobile-async-parse-widget-backlog.md) | docs |
| 2026-03-17 | [면접 준비 문서 최신화와 PDF 재생성](./history/2026-03-17-27-interview-doc-refresh.md) | docs |
| 2026-03-17 | [추가 면접 Q&A 문서화와 PDF 생성](./history/2026-03-17-28-interview-qa-expansion.md) | docs |
| 2026-03-17 | [코드 주석 최신화](./history/2026-03-17-29-comment-refresh.md) | docs |
| 2026-03-17 | [흐름 파악용 주석 보강](./history/2026-03-17-30-flow-comment-annotation.md) | docs |
| 2026-03-17 | [중간 흐름 주석 보강](./history/2026-03-17-30-inline-comment-pass.md) | docs |
| 2026-03-17 | [면접 Q&A 문서 재정리와 PDF 재생성](./history/2026-03-17-31-interview-qa-refresh.md) | docs |
| 2026-03-18 | [면접 Q&A 캐시 무효화 설명 보강](./history/2026-03-18-01-interview-cache-qa-tuning.md) | docs |
| 2026-03-18 | [React 훅 전수 정리 문서와 PDF 생성](./history/2026-03-18-03-react-hooks-doc.md) | docs |
| 2026-03-18 | [React 훅 문서에 useOptimistic 보강](./history/2026-03-18-04-react-hooks-useoptimistic.md) | docs |
| 2026-03-18 | [면접 문서 표현 보정](./history/2026-03-18-05-interview-wording-tuning.md) | docs |
| 2026-03-18 | [면접 문서에 서버 액션 선택 이유 보강](./history/2026-03-18-06-interview-server-action-qa.md) | docs |
| 2026-03-18 | [면접 문서에 보안 Q&A 보강](./history/2026-03-18-07-interview-security-qa.md) | docs |
| 2026-03-18 | [면접 문서의 AI 역할 설명 수정](./history/2026-03-18-11-interview-ai-role-correction.md) | docs |
| 2026-03-18 | [면접 문서 변경 사항 총정리 문서와 PDF 추가](./history/2026-03-18-28-interview-docs-summary.md) | docs |
| 2026-03-18 | [면접 문서 요약을 overview 형식으로 재작성](./history/2026-03-18-29-interview-docs-overview-rewrite.md) | docs |
