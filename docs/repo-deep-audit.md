# Household Account Book — 저장소 심층 감사와 현대화 로드맵

- 감사 일시: 2026-08-18 KST
- 저장소: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail`
- 현재 브랜치: `roadmap-llm-models-5-6sol-deep-exploration`
- 현재 커밋: `4e112e1e260204935163cdfbbe757bf99a492ac5`
- 원격 기준: `origin/main`도 동일 커밋
- 방식: 현재 트리 정적 감사, 전체 reachable Git history/원격 브랜치 감사, 안전한 로컬 정적 검사, 익명 공개 URL HEAD 검사, 공식 제공자 문서 확인
- 변경 범위: 이 보고서만 작성했다. 제품 코드와 기존 미추적 `.omc/`는 수정하지 않았다.

## 판정 언어

- **확정/현재 소스**: 현재 커밋의 코드나 설정으로 직접 확인했다.
- **확정/명령**: 이 감사에서 실행한 명령 결과로 직접 확인했다.
- **확정/히스토리**: 커밋/원격 브랜치 객체로 직접 확인했으나 현재 제품에는 포함되지 않는다.
- **확정/공식 문서**: 2026-08-18에 제공자 공식 문서에서 확인했다.
- **추론**: 소스가 강하게 시사하지만 실제 DB, 인증 세션, 벤더 API, 네이티브 바이너리에서 재현하지 않았다.
- **미검증**: 필요한 권한·비밀값·격리 DB·스토어 콘솔·실기기가 없어 확인하지 않았다.

## Executive summary

이 저장소는 단순 데모보다 훨씬 넓다. 이메일 인증, 자연어/이미지 파싱, 거래 CRUD, 반복 거래, 예산, 통계, 자산·부채, 필드 암호화, Capacitor 셸까지 하나의 제품 흐름으로 연결되어 있다. 특히 파싱 결과를 바로 저장하지 않고 편집 시트를 거치게 한 점, 거래와 계좌 잔액 변경을 일부 DB 트랜잭션으로 묶은 점, 요청 입력 상한과 DB 기반 rate limit를 도입한 점은 좋은 기반이다.

그러나 모델 교체보다 먼저 막아야 할 문제가 있다. 가장 큰 것은 인증 사용자가 전달한 `accountId`/`categoryId`의 소유권을 쓰기 경계에서 검증하지 않고, 계좌 잔액 잠금·수정을 UUID만으로 수행하는 교차 테넌트 경계 결함이다. 여기에 환경 확인 없는 `db:init` 전체 초기화, 공개된 Android 릴리스 서명 자격 증명, 깨진 Drizzle snapshot, 제거된 CI와 깨진 governance gate, 현재 direct runtime 패키지 advisories가 겹친다. 이 상태에서 모델·정산·음성 기능을 먼저 확대하면 오류와 비용, 개인정보 전송 면적만 커진다.

LLM 계층은 세 제공자를 지원하지만 실제 전략은 품질 라우팅이라기보다 “설정된 모든 텍스트 제공자 동시 호출 후 첫 성공 채택”이다. 한 요청이 Moonshot Kimi, Fireworks의 같은 Kimi 계열, MiniMax로 동시에 전송될 수 있어 요청 단위 quota와 실제 벤더 호출·비용·개인정보 전송량이 불일치한다. 출력은 정규식 JSON 추출과 수동 검증에 의존하며, prompt/eval/version/cost telemetry가 없다. 2026년 현재 Kimi, Fireworks, MiniMax 모두 JSON Schema 기반 structured output을 공식 지원하므로, 과거에 비싸거나 불안정했던 “엄격한 구조화 출력 + 평가 기반 단일 라우팅”이 현실적인 우선 현대화 후보다.

권장 순서는 다음과 같다.

1. **P0 신뢰 경계**: 테넌트 소유권, signing secret, destructive DB 명령, 취약 dependency, migration integrity를 먼저 닫는다.
2. **P1 결정론**: 모든 Server Action 입력을 boundary schema로 파싱하고 DB 제약·idempotency·반복 거래 생성 규칙을 보강한다.
3. **P1 LLM 계약**: structured output, typed error, request/attempt quota, golden eval을 만든 뒤 모델을 비교한다.
4. **P2 제품 회복력**: CI/E2E, export/backup/account recovery, 모바일 예산 탐색, PWA/native 환경 분리를 완성한다.
5. **P3 확장**: 정산 브랜치는 그대로 merge하지 말고 현재 main 위에서 불변조건과 fixture만 회수해 재구축한다.

## 현재 제품과 호출 사슬

### 1. 인증과 라우팅

1. `/`는 서버 세션을 읽어 로그인 사용자를 `/transactions`, 비로그인 사용자를 `/login`으로 보낸다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/page.tsx:5`.
2. 인증 페이지 레이아웃은 실제 서버 세션을 다시 확인해 로그인 사용자를 대시보드로 보낸다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/(auth)/layout.tsx:11`.
3. 로그인/가입 클라이언트는 Better Auth email API를 호출하고 `/transactions`로 이동한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/components/auth/LoginPageClient.tsx:24`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/(auth)/register/page.tsx:29`.
4. `/api/auth/[...all]`가 Better Auth handler를 노출한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/api/auth/[...all]/route.ts:6`.
5. Better Auth는 Drizzle 테이블, DB rate limit, 이메일/비밀번호, 가입 후 기본 카테고리 생성, 세션 IP/UA HMAC 최소화를 구성한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/auth.ts:27`.
6. middleware는 쿠키 존재 여부만 보는 빠른 UX gate이고, 대시보드 레이아웃과 Server Action이 실제 세션을 재검증한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/middleware.ts:13`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/(dashboard)/layout.tsx:14`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/auth.ts:166`.

### 2. 자연어/이미지 파싱

1. 대시보드 레이아웃이 사용자 카테고리와 계좌를 읽어 전역 입력 UI를 지연 렌더링한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/(dashboard)/layout.tsx:41`.
2. `NaturalInputBar`가 텍스트와 base64 이미지를 `/api/parse` JSON body로 전송한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/components/transaction/NaturalInputBar.tsx:76`.
3. route가 origin → 세션 → 사용자 quota → 이미지/텍스트 validation을 수행한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/api/parse/route.ts:68`.
4. `executeTextParse`는 OOD, 카테고리/계좌 조회, 은행 메시지 전처리, 제공자 선택을 거친다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/services/parse-core.ts:246`.
5. 텍스트는 설정된 모든 provider를 `Promise.any`로 경쟁시키고 첫 `success:true`를 채택한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/services/parse-core.ts:318`.
6. 이미지는 Fireworks 우선 후 Kimi 순차 경로를 사용한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/services/parse-core.ts:447`.
7. provider adapter가 prompt를 만들고 OpenAI-compatible Chat Completions를 호출한 후 정규식으로 JSON을 추출·검증한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/llm/index.ts:228`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/llm/index.ts:307`.
8. `UnifiedInputSection`이 결과를 거래/계좌 시트로 분기하고, 혼합 결과는 거래 시트 후 계좌 시트를 연다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/components/transaction/UnifiedInputSection.tsx:125`.
9. 거래 결과는 `createTransactions`, 계좌 결과는 `upsertParsedAccountsBatch`로 저장된다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/components/transaction/ParseResultSheet.tsx:571`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/components/assets/AccountParseResultSheet.tsx:449`.

### 3. 수동 거래와 잔액

1. 사이드바/하단 탭의 “입력”이 전역 수동 입력 dialog를 연다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/components/layout/Sidebar.tsx:100`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/components/layout/BottomTabBar.tsx:73`.
2. dialog는 카테고리·계좌를 불러오고 `createSingleTransaction`을 호출한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/components/transaction/ManualInputDialog.tsx:40`.
3. Server Action은 transaction insert와 계좌 잔액 변경을 하나의 DB transaction으로 묶는다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/transaction.ts:596`.
4. 수정/삭제 역시 원거래를 사용자 범위로 읽고 잔액을 역산한 후 재적용한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/transaction.ts:471`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/transaction.ts:507`.

### 4. 반복 거래

1. 거래 화면이 반복 거래 manager와 자동 적용을 연결한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/(dashboard)/transactions/page.tsx:208`.
2. 수동 적용은 recurring rule과 같은 달의 기존 transaction signature를 비교한 뒤 insert한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/recurring.ts:76`.
3. 자동 적용은 거래 페이지 서버 렌더에서 fire-and-forget으로 시작된다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/(dashboard)/transactions/page.tsx:214`.

### 5. 읽기 화면

- 거래: 월 요약, 달력, 주간/카테고리 차트, 검색/필터, 반복 거래, 거래 목록을 여러 Suspense 경계로 조합한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/(dashboard)/transactions/page.tsx:141`.
- 통계: 월 요약, 6개월 추이, 카테고리 랭킹: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/(dashboard)/statistics/page.tsx:68`.
- 예산: 월별 예산과 지출 집계: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/(dashboard)/budget/page.tsx:34`.
- 자산: 복호화된 계좌 목록과 앱 레벨 순자산 합산: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/(dashboard)/assets/page.tsx:6`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/account.ts:57`.
- 설정: 프로필, 카테고리, 테마, 비밀번호 재검증 후 계정 삭제: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/(dashboard)/settings/page.tsx:8`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/settings.ts:67`.

## P0 — 기능 확장 전에 닫아야 할 결함

### P0-1. 교차 테넌트 계좌 잔액 변경 가능 경계

**판정: 확정/현재 소스, 런타임 악용 미시도.**

- `createTransactions`는 요청 항목의 `accountId`를 그대로 transaction row에 넣는다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/transaction.ts:182`.
- `createSingleTransaction`도 caller가 준 `categoryId`/`accountId`를 소유권 확인 없이 저장한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/transaction.ts:596`.
- `updateTransaction`도 새 `categoryId`/`accountId`를 사용자 소유인지 확인하지 않는다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/transaction.ts:507`.
- 가장 중요한 잔액 lock/update는 `WHERE id = accountId`뿐이며 `user_id`가 없다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/transaction.ts:23`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/transaction.ts:47`.
- transactions FK도 `account_id -> accounts.id`, `category_id -> categories.id`만 보장하고 같은 `user_id`를 보장하지 않는다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/db/schema.ts:137`.
- DB 연결은 manual RLS 문서상 `service_role`이 모든 RLS를 우회하는 전제다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/db/manual-migrations/0006_enable-rls-all-tables.sql:4`.

영향은 “다른 사용자의 UUID를 알아야 한다”는 난이도 제한이 있지만, 애플리케이션이 보장해야 할 테넌트 불변조건이 없다. 악의적 Server Action 호출이나 이미 잘못 연결된 row를 통해 다른 사용자의 암호화 잔액을 변경하거나, 다른 카테고리/계좌 이름을 join·복호화할 수 있는 경로가 생긴다.

**필수 수정**

1. 모든 write boundary에서 `accountId`/`categoryId`를 같은 DB transaction 안에서 `id AND user_id`로 resolve하고, 없으면 원래 오류를 반환한다.
2. `adjustAccountBalance`/`reverseAccountBalance`가 반드시 `userId`를 받도록 바꾼다.
3. 가능한 경우 `(id, user_id)` unique + transaction의 `(account_id, user_id)`/`(category_id, user_id)` composite FK로 DB 불변조건을 만든다.
4. 두 사용자 격리 integration test로 생성·수정·삭제·예산·반복 거래를 모두 잠근다.

### P0-2. 부채 계좌 잔액 방향이 자산과 동일

**판정: 확정/현재 소스 + 확정/히스토리.**

- 계좌는 `asset | debt`, 세부 유형은 `credit_card | loan` 등을 허용한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/db/schema.ts:206`.
- 그러나 잔액 함수는 계좌 type을 읽지 않고 `income => +amount`, `expense => -amount`만 적용한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/transaction.ts:23`.
- 순자산은 모든 debt balance를 양수 부채로 간주해 차감한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/account.ts:67`.
- 삭제된 P1 TODO도 같은 충돌을 정확히 기록했다. 역사 경로: `git show 34f42835^:todos/001-ready-p1-credit-card-billing-and-negative-expense.md`, 특히 15–26행. 이 문서는 현재 기능 증거가 아니라 미해결 설계 증거다.

카드 부채에 지출을 연결하면 부채가 증가해야 하는데 현재는 감소한다. 음수 부채가 되면 순자산이 과대 계산될 수 있다. 계좌 연결 기능의 핵심 재무 정합성 결함이다.

**필수 수정**: balance mutation을 `account.type/subType + transaction semantic + transfer event`의 명시적 상태 전이로 바꾸고, 자산 지출/자산 수입/카드 사용/카드 결제/대출 실행/상환을 서로 다른 test matrix로 고정한다.

### P0-3. 환경 guard 없는 전체 DB 초기화

**판정: 확정/현재 소스. 실행하지 않음.**

- `db:init`은 `db:reset → migrate → seed`다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/package.json:20`.
- `db:reset`은 보안·인증·거래·예산·카테고리 테이블과 `user`를 `TRUNCATE ... CASCADE`한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/db/reset.ts:13`.
- README 빠른 시작은 환경 분리 확인 없이 이 명령을 권한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/README.md:61`.
- 현재 계획서 자체가 dev/prod DB·server 분리를 아직 계획 단계로 둔다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/docs/implementation-plan.md:13`.

오타로 운영 `DATABASE_URL`을 사용하면 전체 사용자 데이터를 지울 수 있다. `db:reset`은 production URL 거부, 명시적 environment marker, typed confirmation, 백업 확인을 요구해야 한다. `db:init`은 README 기본 happy path에서 제거하고 새 disposable DB에만 허용해야 한다.

### P0-4. Android 릴리스 signing 자격 증명이 소스에 하드코딩

**판정: 확정/현재 소스. 값은 이 보고서에서 의도적으로 비공개.**

- release signing config가 keystore 경로와 비밀번호/alias를 literal로 포함한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/android/app/build.gradle:19`.
- keystore 파일 자체는 `.gitignore` 대상이며 현재 worktree에는 없었다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/.gitignore:44`.
- 이 설정은 커밋 `d7705770607234b0100fc0b38c8580f757b284f7`에서 추가되어 공개 Git history에도 남아 있다.

비밀번호는 이미 공개된 것으로 취급하고 keystore/alias 자격 증명을 회전해야 한다. signing은 CI/store secret 또는 로컬 비추적 `keystore.properties`에서만 주입하고, 소스에는 필수값 누락 시 fail-closed 하는 설정만 남겨야 한다.

### P0-5. Drizzle migration metadata가 깨져 있다

**판정: 확정/명령.**

- 명령: `node node_modules/drizzle-kit/bin.cjs check --config=drizzle.config.ts`
- 결과: `Expected double-quoted property name in JSON at position 8301 (line 324 column 3)`.
- 원인 파일은 `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/db/migrations/meta/0000_snapshot.json:324`의 trailing comma다.
- 이 손상은 `04926f3bbcd7d28da1a6a2d495177eb7481b4492`가 제거된 `users` block 뒤 comma를 남긴 데서 시작했다.
- 0006, 0007, 0008 journal/SQL은 있지만 대응 snapshot이 없다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/db/migrations/meta/_journal.json:47`; 실제 `meta/`에는 0000–0005 snapshot만 있다.
- settlement 원격 브랜치에는 legacy DB journal repair script가 있지만 main에는 없다: `44d64a15d1837ee8a517e313e6a1f889f79e8402`.

`migrate`가 snapshot 없이 SQL을 적용할 수 있는지와 별개로 `check/generate` 기준선은 현재 실패한다. 운영 DB에 손대기 전 immutable backup, 실제 `drizzle.__drizzle_migrations`, information schema, current schema를 비교해 정식 baseline을 다시 만들어야 한다. 원격 settlement branch의 repair script는 settlement-specific `0008_yellow_luckman`을 가정하므로 그대로 사용하면 안 된다.

### P0-6. 현재 dependency 보안 기준선이 다시 깨졌다

**판정: 확정/명령, exploitability는 개별 미검증.**

- `npm audit --json`: 총 19개(`critical 2`, `high 11`, `moderate 4`, `low 2`).
- direct runtime 의존성인 `next@15.5.18`, `better-auth@1.6.11`에 high advisory가 보고됐다.
- `next` lock 버전: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/package.json:44`; `better-auth`: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/package.json:38`.
- `npm outdated --json`은 same-major 패치 후보로 Next `15.5.23`, Better Auth `1.7.0`을 제시했다. major 최신값을 즉시 선택하라는 뜻은 아니다.
- HEAD `4e112e1e260204935163cdfbbe757bf99a492ac5`는 당시 `npm audit` zero를 기록했지만 2026-08-18 registry/advisory 기준으로는 더 이상 현재 사실이 아니다.

먼저 same-major/supported patch를 별도 브랜치에서 적용하고 auth/session/cookie/Server Action/이미지 경로 regression을 실행한다. `npm audit fix --force`나 검증 없는 Next 16 major migration은 권장하지 않는다.

## P1 — 데이터·인증·보안

### 입력 boundary가 타입 선언에만 의존한다

**판정: 확정/현재 소스.**

`rg -n 'zod|safeParse' package.json src`에서 boundary schema library 사용이 0건이었다. Server Action 인자는 브라우저 런타임에서 임의 payload로 호출 가능하지만 다음 값에 서버 측 길이·범위·format·소유권 validation이 없다.

- 거래 amount/date/description/account/category: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/transaction.ts:507`, `:596`.
- 계좌 name/subType/icon/balance: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/account.ts:92`.
- budget amount/month/category: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/budget.ts:95`.
- recurring amount/day/month/category: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/recurring.ts:32`, `:76`.
- category name/icon: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/settings.ts:13`.

DB도 amount 양수, recurring day 1–31, `YYYY-MM`, account subtype, description/name 길이 check constraint를 두지 않는다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/db/schema.ts:117`.

**권장**: action마다 하나의 Zod/Standard Schema boundary를 두고 동일 schema를 form, Server Action, LLM structured output, test fixture에 재사용한다. DB에는 독립적인 check/composite FK/partial unique를 둔다.

### RLS는 앱 테넌트 격리 수단이 아니다

**판정: 확정/현재 소스, 실제 운영 적용 상태 미검증.**

- manual SQL은 RLS를 enable만 하고 policy를 하나도 만들지 않는다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/db/manual-migrations/0006_enable-rls-all-tables.sql:40`.
- 앱은 service role로 우회한다고 문서화한다: 같은 파일 4–6행.
- 이 manual SQL은 security events/rate-limit 및 Better Auth `rateLimit` 테이블을 포함하지 않는다. 해당 테이블은 후속 0008에서 추가됐다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/db/migrations/0008_auth-parse-security-hardening.sql:1`.
- Drizzle snapshots는 모두 `isRLSEnabled:false`를 기록한다. manual 적용 여부를 저장소만으로 증명할 수 없다.

RLS를 “PostgREST 차단”과 “앱 테넌트 격리”로 분리해 문서화해야 한다. 장기적으로는 least-privilege app role + 요청별 사용자 context/policy 또는 최소한 모든 app query의 `user_id` 불변조건과 DB composite constraint를 사용한다.

### Rate-limit escalation은 문서대로 3회 누적되기 어렵다

**판정: 확정/현재 소스 로직.**

- 한도 초과 시 `consecutiveBlocks + 1`로 장기 차단을 계산한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/security/index.ts:261`.
- 그러나 첫 두 block은 window 종료까지만이고, window가 끝나면 counter를 0으로 reset한다: 같은 파일 `:214`.
- 한도 이내 요청에서도 counter를 0으로 reset한다: 같은 파일 `:238`.
- 이미 blocked인 요청은 즉시 반환해 counter를 올리지 않는다: 같은 파일 `:203`.

따라서 기본 `escalateAfter=3`에 도달하는 경로가 사실상 사라진다. clock 주입 + DB integration test로 intended policy를 다시 정의해야 한다.

### origin, body, IP 신뢰 경계

- trusted origin 환경변수가 하나도 없으면 parse origin 검증이 fail-open 된다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/security/policy.ts:199`.
- multipart는 `request.formData()`와 `file.arrayBuffer()`로 body를 메모리에 읽은 뒤 8MB policy를 검사한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/api/parse/route.ts:123`, `:160`.
- JSON body도 `request.json()` 후 base64 길이를 검사한다: 같은 파일 `:238`, `:259`.
- IP limiter는 IP header가 없으면 건너뛴다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/security/index.ts:314`.
- `x-forwarded-for` 첫 값을 직접 신뢰한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/security/policy.ts:183`. Vercel이 정규화하는지는 플랫폼 경로별 검증이 필요하다.

플랫폼 body limit, trusted proxy list, 필수 origin config를 startup validation으로 명시해야 한다. route에서 읽은 이후 validation만으로는 애플리케이션 메모리 DoS 상한이 되지 않는다.

### 보안 header와 cookie 계약

- source `next.config.ts`에는 cache header만 있고 CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy가 없다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/next.config.ts:27`.
- 이 항목은 이미 backlog다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/docs/implementation-plan.md:69`.
- 익명 HEAD에서 Vercel HSTS는 확인했지만 나머지 header는 확인되지 않았다. 이 결과는 `tawny` 공개 URL에만 해당한다.
- Better Auth cookie Secure/HttpOnly/SameSite/domain 정책도 코드에서 명시·테스트하지 않고 backlog에만 있다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/docs/implementation-plan.md:77`.

### 계정 복구·세션 관리·개인정보 보유

- email verification, forgot/reset password, MFA/passkey, active session management route/UI가 없다.
- session 기본 수명은 30일이다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/auth.ts:52`.
- 개인정보 방침은 탈퇴 시 즉시 삭제를 말하지만 security events/rate-limit rows는 user FK가 없고 retention/delete job도 없다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/privacy/page.tsx:72`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/db/schema.ts:78`.
- `recordSecurityEvent` 주석은 dashboard 활용을 말하지만 조회/관리/retention 기능은 없다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/security/index.ts:114`.

법률 판정은 이 감사 범위가 아니다. 기술적으로는 data inventory, processor/region/retention, deletion propagation, export/access workflow를 실제 구현과 맞춰야 한다.

### 암호화는 유용하지만 rotation/완결성 계약이 없다

- AES-256-GCM과 random IV를 사용하고 변조 검증 test가 있다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/lib/crypto.ts:1`.
- `decryptString`/`decryptNullable`은 평문을 그대로 반환하는 migration fallback을 영구 유지한다: 같은 파일 `:57`, `:72`.
- key version 문자열은 `v1`이지만 이전 키 lookup/rotation/re-encryption 상태가 없다: 같은 파일 `:6`.
- README는 `ENCRYPTION_KEY`를 “권장”이라 쓰지만 account create와 parsed transaction save는 실제로 키 없이는 실패한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/README.md:87`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/account.ts:92`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/transaction.ts:113`.

필수 env로 문서화하고 키 ID/keyring, 완료 marker, plaintext 검출 query, rotation runbook을 만든 뒤 영구 plaintext fallback을 제거한다.

## P1 — LLM provider/model/prompt/schema/routing

### 현재 provider·model 표

| Provider | 현재 model/base URL | 현재 사용 | 현재 공식 상태와 차이 |
| --- | --- | --- | --- |
| Moonshot/Kimi | `kimi-k2.5`, `api.moonshot.ai/v1` | text race + image | 공식 model list는 K2.5도 유지하지만 일반 최신 선택으로 `kimi-k2.6`, flagship으로 K3를 안내한다. 업그레이드는 eval 후 결정해야 한다. |
| Fireworks | `accounts/fireworks/models/kimi-k2p5` | text race + image 우선 | model page는 현재 Ready이지만 “Serverless not supported”로 표시한다. structured output 문서는 같은 ID 예시를 사용해 catalog와 문서가 충돌한다. 실제 계정 endpoint preflight가 필요하다. |
| MiniMax | `MiniMax-M2.5` | text race | 공식 list는 M2.5와 M2.7을 모두 제공하며 M2.7을 최신으로 안내한다. M2.5가 폐기된 것은 아니다. |

현재 설정 근거: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/llm/client.ts:19`.

2026-08-18 공식 문서:

- Kimi models/API: [Model List](https://platform.kimi.ai/docs/models), [Chat Completion](https://platform.kimi.ai/docs/api/chat), [Capabilities](https://www.kimi.com/help/kimi-api/api-model-capabilities).
- Fireworks: [Kimi K2.5 model page](https://fireworks.ai/models/fireworks/kimi-k2p5), [Structured Outputs](https://docs.fireworks.ai/structured-responses/structured-response-formatting), [Prompt caching](https://docs.fireworks.ai/guides/prompt-caching).
- MiniMax: [Model List](https://platform.minimax.io/docs/api-reference/models/openai/list-models), [Text API](https://platform.minimax.io/docs/api-reference/text-post), [Pricing/cache](https://platform.minimax.io/docs/guides/pricing-paygo).

### 항상 fan-out 하는 text race

**판정: 확정/현재 소스.**

- Kimi, Fireworks, MiniMax key가 모두 있으면 셋을 동시에 호출한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/services/parse-core.ts:92`.
- user quota는 5분 20 “요청”만 센다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/api/parse/route.ts:32`.
- 따라서 20 user requests가 최대 60 vendor attempts가 될 수 있다.
- Moonshot Kimi와 Fireworks Kimi는 같은 Kimi K2.5 계열이라 모델 다양성보다 hosting/rate-limit 다양성이 크다.
- 첫 성공은 정확도·confidence·schema completeness를 비교하지 않고 latency만으로 결정된다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/services/parse-core.ts:404`.
- 승자 결정 후 abort는 시도하지만, 이미 생성된 토큰·과금이 취소되는지는 provider별 미검증이다.

사용자 원문뿐 아니라 모든 기존 account name/type과 category name이 system prompt에 포함된다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/llm/prompt.ts:22`. 텍스트 race는 이 context를 모든 configured provider endpoint에 동시 전송한다.

**권장**: runtime은 eval로 선택한 deterministic primary 한 곳만 호출하고 실패 시 original typed error를 보존한다. 다중 provider 비교는 합성/golden dataset의 offline eval에서 수행한다. 제품에서 hedge가 꼭 필요하면 명시적 정책·시도 예산·지연 threshold·사용자 동의·모든 attempt audit를 별도 설계해야 하며 silent fallback으로 구현하면 안 된다.

### 이미지 routing의 문서와 동작이 다르다

- “Fireworks 3회 후 Kimi” counter는 process memory라 instance/restart 간 공유되지 않는다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/services/parse-core.ts:35`.
- Kimi key가 없으면 3회 이후에도 Fireworks를 “최후” 경로로 다시 사용한다: 같은 파일 `:102`.
- 현재 image loop는 content failure도 다음 Kimi로 진행하고 recoverable 여부는 cooldown에만 사용한다: 같은 파일 `:472`.
- unmerged `origin/codex/docs-handoff-20260317`의 `28e996cc...`는 content error에서 fallback 중단을 구현했지만 main에는 들어오지 않았다.

quota를 DB의 provider attempt 단위로 옮기고, image provider policy도 단일 typed state machine으로 만든다.

### 출력 schema는 TypeScript interface가 아니라 수동 런타임 검사

**판정: 확정/현재 소스.**

- `extractJSON`은 fenced/object/array greedy regex로 payload를 고른다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/llm/index.ts:33`.
- transaction validation은 date format, category membership, description 길이, recurring day 범위, finite integer를 확인하지 않는다: 같은 파일 `:51`.
- account validation은 `Math.abs(Number(balance))`로 `NaN`/`Infinity`/numeric string을 통과시킬 수 있다: 같은 파일 `:88`.
- unknown intent는 transaction으로 default된다: 같은 파일 `:122`.
- prompt의 JSON 예시에도 `required`나 `additionalProperties:false`를 기계적으로 강제할 계약이 없다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/llm/prompt.ts:137`.

Kimi는 `json_schema` structured output을 “recommended”로, Fireworks와 MiniMax도 JSON Schema를 공식 지원한다. 지금은 과거보다 strict structured output을 적용하기 쉬운 시점이다. 하나의 boundary schema에서 TypeScript type + provider JSON Schema + runtime parser를 생성하고, provider 응답 뒤에도 동일 schema로 검증한다.

### prompt와 cache

- system prompt 시작부에 매 요청 바뀌는 today, categories, accounts를 둔다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/llm/prompt.ts:32`.
- Fireworks 공식 cache 지침은 stable prefix를 앞에, 동적 context를 뒤에 두라고 한다.
- Kimi는 자동 context cache와 `prompt_cache_key`를 지원하며, MiniMax는 명시적 prompt caching 경로를 제공한다.
- 현재 token usage/cache hit/input cost를 기록하지 않아 이득을 측정할 수 없다.

**권장**: 정적 규칙/JSON Schema를 stable system prefix에 두고 날짜·사용자 카테고리·최소 account context·원문은 뒤로 이동한다. dedicated/shared cache를 쓸 경우 tenant isolation key를 사용한다. raw finance input 자체의 결과 cache는 privacy/idempotency 정책 전에는 도입하지 않는다.

### prompt injection과 데이터 최소화

- user input은 `[START] ... [END]` text delimiter 안에 그대로 삽입된다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/llm/prompt.ts:179`.
- delimiter는 신뢰 경계가 아니므로 사용자가 prompt instruction을 삽입할 수 있다.
- account prompt에는 이름/type만 필요한데 `getUserAccounts`는 모든 row와 balance를 읽고 복호화한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/services/parse-core.ts:222`.

structured output은 형식 공격면을 줄이지만 의미 공격을 해결하지 않는다. account/category matching을 가능한 한 로컬 deterministic 후처리로 옮기고, provider에는 필요한 최소 데이터만 보낸다. account query도 필요한 column만 select한다.

### 오류 분류와 관측성

- provider error는 `success:false` 문자열로 접혀 status/code/class가 사라진다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/llm/index.ts:284`.
- recoverability는 `"response"`, `"401"`, `"500"` 같은 substring으로 판정한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/services/parse-core.ts:123`.
- 일부 raw SDK/DB error message가 Server Action/API 응답을 거쳐 UI에 노출된다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/transaction.ts:312`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/llm/index.ts:295`.
- 로그에는 provider/model/elapsed/input length가 있지만 request ID, HTTP status, provider code, finish reason, prompt/output/cache tokens, billed cost, abort origin이 없다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/llm/index.ts:274`.
- 계획서도 같은 observability backlog를 기록한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/docs/implementation-plan.md:59`.

`ParseAttemptError` 같은 discriminated union으로 timeout/auth/quota/network/provider-5xx/content/schema/abort를 분리하고, API boundary에서 안전한 사용자 문구로 매핑하되 내부에는 원본 error chain을 보존한다. raw input 대신 HMAC hash와 길이/line/image metadata만 기록한다.

### cancel은 브라우저 fetch만 취소한다

**판정: 확정/현재 소스, 실제 vendor cancellation 미검증.**

- 클라이언트 취소는 local `AbortController`로 fetch를 abort한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/components/transaction/NaturalInputBar.tsx:364`.
- route는 `request.signal`을 `executeTextParse/executeImageParse`로 전달하지 않는다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/api/parse/route.ts:378`.
- provider signal은 내부 timeout/race controller에서만 온다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/llm/index.ts:156`.

따라서 UI는 취소됐어도 서버/vendor work가 timeout까지 계속될 수 있다. request disconnect signal을 provider call까지 구조적으로 연결하고 cancellation reason을 기록해야 한다.

### eval 부재

현재 LLM 관련 test는 production `raceTextProviders`를 호출하지 않고 test 안에 같은 패턴을 다시 구현한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/services/__tests__/text-race.test.ts:7`.

현재 트리에는 다음이 없다.

- Korean transaction/account golden fixtures.
- OOD false-positive/false-negative suite.
- date/amount/refund/card/recurring boundary corpus.
- provider/model quality, latency, cost comparison harness.
- prompt/model version 저장.
- user correction feedback capture.
- image/OCR real sample regression.

모델 upgrade 전에 최소 100–300개 비식별/합성 fixture로 field-level exactness, intent, abstention, category mapping, date, amount, recurring, account matching을 측정하고 모델별 P50/P95 latency와 cost를 함께 gate해야 한다.

## P1 — 데이터 정합성, 반복 거래, 캐시

### 반복 거래 중복 생성은 동시성에 안전하지 않다

- 수동 적용은 select → in-memory signature filter → insert이며 unique constraint나 lock이 없다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/recurring.ts:76`.
- 자동 적용도 같은 패턴이다: 같은 파일 `:234`.
- `createTransactions`의 recurring dedupe는 DB transaction 안에 있지만 기존 row를 lock하거나 unique signature를 강제하지 않아 concurrent request 둘이 모두 absence를 볼 수 있다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/transaction.ts:215`.
- schema에는 recurring unique key가 없다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/db/schema.ts:163`.

`recurring_rule_id + occurrence_month/date`를 transaction에 저장하고 unique constraint + `ON CONFLICT DO NOTHING`으로 idempotency를 DB에 위임해야 한다.

### 페이지 render에서 write를 fire-and-forget 한다

- transactions server page가 `autoApplyRecurringTransactions().catch(() => {})`를 await하지 않고 실행한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/(dashboard)/transactions/page.tsx:214`.
- action도 모든 오류를 0으로 숨긴다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/recurring.ts:311`.
- dashboard의 `RoutePrefetcher`는 다른 탭에서 `/transactions`를 background prefetch한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/components/layout/RoutePrefetcher.tsx:18`.

**추론**: RSC prefetch/render가 이 side effect를 실행하면 실제 방문 전 write, 동시 duplicate, 실패 은폐가 생길 수 있다. live DB로 재현하지 않았다. write-on-read를 제거하고 명시적 idempotent scheduled job 또는 user action으로 옮겨야 한다.

### KST가 일부 서버 경로에만 적용됐다

- 공통 KST helper는 있다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/lib/format.ts:27`.
- LLM today와 transaction page는 이를 사용한다.
- 반복 거래 auto apply와 statistics trend는 bare `new Date()`를 사용한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/recurring.ts:238`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/statistics.ts:32`.

**추론**: UTC server에서는 KST 자정 전후 적용일/월이 어긋날 수 있다. clock/timezone을 주입하고 UTC/KST month-boundary test를 추가한다.

### 예산·카테고리 uniqueness와 계좌 원장

- overall budget은 `category_id NULL`인데 PostgreSQL unique index는 NULL을 서로 다르게 취급해 concurrent overall budget duplicate를 막지 못한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/db/schema.ts:183`.
- budget upsert는 transaction 없는 read-then-write다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/budget.ts:103`.
- 계좌 잔액은 암호화된 mutable derived value라 DB sum/atomic arithmetic를 쓸 수 없고 매 transaction마다 decrypt/re-encrypt한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/account.ts:57`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/transaction.ts:31`.

장기적으로 balance snapshot과 immutable ledger event를 분리하는 것이 카드·정산·외부 동기화까지 가장 안전하게 확장된다.

### cache는 user key를 포함하지만 invalidation이 전역이다

- `unstable_cache` 함수 인자에 `userId`가 들어가므로 현재 호출 형태에서 cache key는 사용자별이다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/actions/transaction.ts:327`.
- 그러나 tag는 `transactions`, `accounts`처럼 전역이라 한 사용자 mutation이 모든 사용자의 같은 tag를 무효화한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/lib/cache-keys.ts:15`.
- 이는 데이터 leak 증거는 아니지만 규모가 커지면 cache churn을 만든다.

tenant-scoped tag를 사용하고, 거래 mutation이 account summary/list cache를 즉시 무효화하는지 integration test로 확인한다.

## P1/P2 — 제품·UX

### 강점

- AI 결과를 사람이 편집·삭제·카테고리 추가한 뒤 저장한다; 자동 저장이 아니다.
- 혼합 transaction/account 입력을 순차 review한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/components/transaction/UnifiedInputSection.tsx:125`.
- image compression, request de-dup/abort, retry UI, session draft, accessible labels가 있다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/components/transaction/NaturalInputBar.tsx:141`.
- 거래 화면은 summary/calendar/insights Suspense를 분리하고 client filter를 제공한다.
- 달력 keyboard semantics와 reduced-motion CSS가 있다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/components/dashboard/CalendarView.tsx:88`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/app/globals.css:294`.

### 모바일에서 예산으로 갈 navigation이 없다

**판정: 확정/현재 소스.**

- desktop Sidebar에는 `/budget`이 있다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/components/layout/Sidebar.tsx:13`.
- mobile BottomTabBar에는 홈/분석/입력/자산/설정만 있고 예산이 없다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/components/layout/BottomTabBar.tsx:12`.
- 전체 current source에서 사용자가 누를 수 있는 `/budget` 링크는 Sidebar뿐이다.

모바일 퍼스트 핵심 기능이 URL 직접 입력 외에는 발견되지 않는다. 예산을 분석 또는 설정 안에 명시적 entry로 제공하거나 모바일 IA를 다시 정한다.

### 민감한 draft를 sessionStorage 평문으로 저장

- 자연어 입력 전체를 `sessionStorage["draft-natural-input"]`에 저장한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/components/transaction/NaturalInputBar.tsx:194`, `:496`.
- 성공 시에는 제거하지만 logout/tab 유지 중에는 남을 수 있고 privacy 문서에 명시되지 않는다.

공유 기기 threat model을 정하고 logout/unmount/expiry 삭제, 사용자 opt-out, 저장 범위 최소화를 적용한다.

### 필수 사용자 신뢰 기능이 없다

현재 route/source search 결과 다음이 없다.

- 데이터 export/import/backup/restore.
- password reset/account recovery.
- budget alert/push notification.
- household/shared ledger/invite.
- multi-currency.
- account/session history UI.

금융성 개인 데이터 앱은 AI 기능보다 export/backup과 recovery를 먼저 제공하는 편이 신뢰와 이탈 방지에 직접적이다.

### 성공 feedback 제거의 trade-off

`d2fc205b5a53d7160d26e839cb4e2fb6e0025c68`는 저장 완료 banner를 제거했다. 현재 UI는 sheet close와 optimistic update에 의존한다. 빠르지만 네트워크 지연·부분 revalidation·background failure에서 “저장됐는지” 확인하기 어렵다. 전역 banner를 복원하라는 뜻은 아니며, row-level confirmed state 또는 accessible toast를 behavior test와 함께 설계해야 한다.

### SEO/public 정보 구조 drift

- robots sitemap은 `https://household-account-book.vercel.app/sitemap.xml`을 가리키지만 sitemap 파일/route가 없다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/public/robots.txt:10`.
- 2026-08-18 익명 확인에서 그 sitemap은 404, old domain root는 500이었다.
- native config의 `tawny` URL은 root 307 → `/login`, manifest/sw는 200이었다.
- robots는 `/dashboard`를 막지만 실제 protected main routes인 `/transactions`, `/statistics`, `/assets`, `/budget`은 나열하지 않는다.

이는 authenticated runtime proof가 아니라 공개 URL/SEO drift 증거다.

## P1/P2 — 테스트, CI, 배포

### 현재 로컬 검증

| 명령 | 결과 | 범위 |
| --- | --- | --- |
| `node node_modules/typescript/bin/tsc --noEmit` | exit 0, 출력 없음 | 현재 TypeScript 정적 검사 |
| `node node_modules/eslint/bin/eslint.js src eslint.config.mjs` | exit 0; caniuse-lite 6개월 stale warning | lint/a11y 규칙 |
| `node node_modules/vitest/vitest.mjs run` | 4 files, 31/31 tests PASS, 611ms | crypto 14, security helper 7, race replica 8, utils 2 |
| `node scripts/validate-governance.mjs` | FAIL, `.claude/skills` ENOENT | governance contract |
| `node node_modules/drizzle-kit/bin.cjs check --config=drizzle.config.ts` | FAIL, invalid snapshot JSON | migration metadata |
| `git diff --check` | PASS | tracked patch whitespace |

Build는 `.next`를 쓰는 작업이고 이 요청은 read-only였으므로 이 감사에서 실행하지 않았다. E2E는 DB, auth secrets, LLM keys, browser와 user 생성 side effect가 필요해 실행하지 않았다.

### 테스트 포트폴리오가 핵심 도메인을 덮지 않는다

- 총 unit test 31개지만 DB Server Action, tenant ownership, balance semantics, auth hook, parse route, prompt/OOD/bank message, migration, cache invalidation test가 없다.
- race test는 production 함수가 아니라 복제 helper를 테스트한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/services/__tests__/text-race.test.ts:7`.
- 유일한 Playwright test는 실제 회원가입·계좌 생성·최대 120초 LLM parse를 사용하고 cleanup이 없다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/e2e/account-parse-rematch.spec.ts:34`, `:60`.
- retries=0, webServer는 local dev이고 CI workflow가 없다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/playwright.config.ts:6`.

다음 test pyramid가 필요하다.

1. pure domain: amount/date/card/debt/recurring/LLM schema.
2. Postgres integration: two-tenant ownership, composite FK, balance lock, idempotency, rate-limit clock.
3. API contract: origin/auth/body/quota/cancel/error redaction.
4. deterministic LLM adapter: local HTTP fake at wire level + golden eval runner.
5. E2E: auth/manual transaction/edit/delete/export와 하나의 controlled parse fixture; 실제 vendor smoke는 별도 opt-in lane.

### CI가 의도적으로 제거됐고 대체되지 않았다

- `.github/workflows`에는 현재 파일이 없다. `.github`에는 PR template만 있다.
- `a07ff01e48b135cba6401d3cf6a9508b1f98b864`가 Quality workflow를 제거했다.
- 삭제 전 workflow는 Node 22, `npm ci`, typecheck, build, unit, governance를 실행했다.
- 제거 문서는 대체 workflow를 만들지 않았다고 명시한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/docs/history/2026-03-18-32-remove-quality-action.md:21`.
- 현재 `check:all`은 lint, audit, format, migration check, E2E를 포함하지 않으며 governance에서 실패한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/package.json:23`.

최소 CI는 lockfile install → secret/hygiene scan → type/lint/format → unit → migration metadata → Postgres integration → build → scoped E2E를 분리한다. dependency update bot과 weekly audit도 추가한다.

### 배포/운영 proof가 없다

- Vercel workflow/config/health endpoint/rollback runbook이 없다.
- `/api/health`가 없다.
- README의 Android release build와 앱스토어 상태는 역사 설명이며 현재 binary/store proof가 아니다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/README.md:13`, `:21`.
- 익명 URL 확인은 로그인 redirect/manifest/sw 응답과 일부 header만 증명한다. DB/auth/parse/native/store 상태는 증명하지 않는다.

## P1/P2 — PWA와 Capacitor

### PWA는 manifest와 미등록 service worker 수준

- manifest는 standalone/icons를 정의한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/public/manifest.json:1`.
- `sw.js`는 cache 없이 모든 fetch를 network로 전달한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/public/sw.js:1`.
- current source에 `navigator.serviceWorker.register`가 0건이다.
- 따라서 sw endpoint가 200이어도 앱이 등록한다는 소스 증거가 없다. offline 동작도 명시적으로 없다.

PWA를 유지하려면 registration/update/offline UX/background sync scope를 결정하고 test한다. 필요 없다면 오해를 부르는 dead sw를 제거하고 manifest install-only 범위를 문서화한다.

### Native shell 환경과 release identity가 분리되지 않았다

- Capacitor가 한 production URL을 hard-code한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/capacitor.config.ts:9`.
- README도 remote WebView 방식을 명시한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/README.md:131`.
- Android applicationId는 `com.maj0rika.household`: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/android/app/build.gradle:3`.
- iOS PRODUCT_BUNDLE_IDENTIFIER는 `com.household.app`로 다르다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/ios/App/App.xcodeproj/project.pbxproj:309`.
- Android `allowBackup=true`, release minify=false다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/android/app/src/main/AndroidManifest.xml:4`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/android/app/build.gradle:27`.
- Android/iOS test는 생성된 example 수준이고 native user flow test가 없다.

dev/preview/prod server URL을 build config로 분리하고, bundle IDs/version/signing/privacy manifest/backup policy/deep links를 release matrix로 관리해야 한다. remote content shell의 store policy 적합성은 현재 스토어 콘솔과 심사 결과 없이는 미검증이다.

## 문서와 governance drift

- tracked Markdown 8개를 검사했을 때 broken relative links가 44개였다. 모두 current `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/docs/implementation-plan.md:110` 이후의 삭제된 history 문서다.
- `34f42835ce1ce54639b99affd7cc2ac3b9793360`가 AI/local planning artifacts를 공개 트리에서 제거했지만 validator는 삭제된 `.claude/skills`를 여전히 `readdirSync`한다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/scripts/validate-governance.mjs:190`.
- README는 삭제된 root `AGENTS.md`를 여전히 source of truth로 가리킨다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/README.md:153`.
- `CachePaths.categories`와 middleware `/categories`는 존재하지 않는 page route를 가리킨다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/lib/cache-keys.ts:6`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/middleware.ts:4`.
- README는 MiniMax를 “100자 이하 우선 경로”라 설명하지만 current code는 모든 text provider 동시 race다: `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/README.md:83`, `/Users/leetaehee/.paseo/worktrees/3iv7xzcd/fearless-quail/src/server/services/parse-core.ts:92`.

공개 문서와 내부 운영 문서를 분리하되, tracked 문서는 반드시 current source만 설명하고 link checker/governance check가 CI에서 통과해야 한다.

## 전체 Git history에서 확인한 hard/reverted/abandoned work

### 감사 범위

- `git rev-list --all --count` → 165 commits.
- `git fsck --full --no-reflogs --unreachable` → unreachable object 0.
- reachable refs: main + 4 remote topic branches. auth/security와 governance branches는 main에 merged되어 unique commit 0; settlement와 docs-handoff는 미병합이다.

### 1. Phase 14 settlement — 큰 구현이지만 현재 제품 아님

**판정: 확정/히스토리.**

- ref: `origin/codex/phase14-settlement-ui` at `63116ac425b684e7342887503e1aaaf694c8b397`.
- merge base: `f79e42f8f08cb90e222eb4ab182fea5e78ce59cd`.
- divergence: main 46 commits, branch 13 commits.
- diff: 62 files, 약 7,854 insertions / 215 deletions.
- 포함: settlements/members/transfers schema, account impact, 정산 board/detail/editor, text/image/transfer parsing, deterministic matching, fixture catalog, tests.
- branch plan은 기능 구현·회귀 안정화를 완료했다고 기록하지만 “실제 카카오/토스 sample QA/fixture 누적 준비” 단계였다고 명시한다: 역사 경로 `origin/codex/phase14-settlement-ui:docs/implementation-plan.md:143`.
- 마지막 status 문서는 남은 범위를 실제 sample QA라고 명시한다: 역사 경로 `origin/codex/phase14-settlement-ui:docs/history/2026-03-10-04-phase14-progress-status-sync.md:20`.

이 브랜치는 이후 auth/parse security, cache, accessibility, Promise.any, dependency patch 46 commits를 포함하지 않는다. 그대로 merge/cherry-pick하면 current migration 0008과 settlement 0008 충돌, tenant/security regression, 대형 UI conflict가 발생한다. 회수 대상은 불변조건, fixture, pure matching tests, UX flow이고 구현은 current main 위에서 재작성해야 한다.

### 2. Structured output branch — 실험 증거는 있으나 main 미반영

- ref: `origin/codex/docs-handoff-20260317` at `c7db5dc30723dcf8c47a47239c2e9d7b91f4724d`.
- merge base: `c5ad328f283acfab74c522729cddfb317d34050b`.
- divergence: main 23 commits, branch 8 commits.
- `e4d34ee1...` JSON mode, `28e996cc...` content-error fallback 중단, `4184aafd...` MiniMax regression 수정, `c7db5dc3...` 통합이 모두 main 기준 unique다.
- branch history는 Fireworks `json_schema`, Kimi/MiniMax `json_object`, max token 제한을 적용했다고 기록한다: 역사 경로 `origin/codex/docs-handoff-20260317:docs/history/2026-03-17-13-json-mode-structured-output.md:6`.

2026년 공식 API는 당시보다 더 직접적인 JSON Schema 지원을 제공한다. 과거 patch를 그대로 가져오기보다 current provider schema dialect와 eval을 기준으로 새 implementation을 만든다.

### 3. Field encryption revert 후 재도입

- 최초 dual-write 확장: `9b84dc180a543d5a88c56b75d6df1b029710188d`.
- 전체 revert: `3f58357c4e4574e4652dbf23cfb359e779ea5ac8`.
- transaction originalInput/memo AES-GCM 재도입: `4822eba84c7f07e7d1a8c805038ff8d57ef8277b`.
- account name/balance 암호화와 core parse 통합: `88dfffa432fd5c751db44173dbf2e26c9126a688`.

현재는 “revert된 기능”이 아니라 더 좁은 형태로 재설계된 기능이다. 다만 plaintext fallback과 key rotation 미완료는 남았다.

### 4. Promise.any hard change

- 첫 도입+docs: `048e3f41529a2d8afdaca4331b0bb5f4823d7f7b`.
- 즉시 revert: `4284d4243bcd7e563ea0af6593fd633fd63230b9`.
- code/test만 재적용: `3a5cb6ec5849df9a5b66ea0c502cf6b3422685f0`.

최종 code는 main에 남아 있다. history는 문서 변경과 code 변경을 분리하기 위한 revert/reapply로 보이며, production race 품질을 증명하지는 않는다.

### 5. 제거·보류 기능

- Google OAuth 제거 `738d696bf405c91cd9b9453edc0958797bbe208d`: custom domain 없이 provider 검토 통과 불가가 이유였다. 현재 custom domain 보유 여부는 미검증이므로 재도입은 조건부다.
- OpenAI models 제거 `93971632cb38a309be8149dd1eff362701819afb`: Kimi/Fireworks 중심으로 전환했다. 현재 repo에는 OpenAI SDK만 compatibility client로 남는다.
- automatic LLM retry 제거 `68ba99161c858e648fbd3c66d4e20a13840a7293`: duplicate vendor calls/ghost response 대신 abort와 one-attempt logging을 도입했다. 이후 always-race가 다시 request당 multi-attempt를 만들었다.
- `PostActionBanner` 제거 `d2fc205b5a53d7160d26e839cb4e2fb6e0025c68`.
- dead parse wrapper 제거 `40f7cd9c3529f6d8b0c16eacb61454617774abd9`.
- Quality CI 제거 `a07ff01e48b135cba6401d3cf6a9508b1f98b864`.
- public planning cleanup `34f42835ce1ce54639b99affd7cc2ac3b9793360`: history rewrite를 거부했으므로 삭제된 내부 문서와 일부 과거 debug code는 Git history에는 남아 있다.

## 이전에는 비싸거나 어려웠지만 지금 다시 검토할 가치가 있는 아이디어

아래 표에서 “새로 가능”은 구현 완료를 뜻하지 않는다. 내부 history와 2026 공식 API 변화로 feasibility가 높아졌다는 추론이다.

| 아이디어 | 증거 | 지금 달라진 점 | 권장 판정 |
| --- | --- | --- | --- |
| strict finance parse contract | unmerged JSON mode branch + current regex parser | Kimi/Fireworks/MiniMax 모두 JSON Schema structured output 공식 지원 | **즉시 P1**. 모델 upgrade보다 먼저 도입하고 golden eval로 gate |
| prompt cost/cache 최적화 | 현재 긴 동적 system prompt, cost telemetry 없음 | Kimi automatic cache, Fireworks prefix cache+metrics, MiniMax cache pricing/API | **P1**. stable prefix 재구성과 cache/token 계측부터 |
| provider fine-tuning | Fireworks K2.5 model page는 fine-tuning 지원 | managed LoRA/RFT 사용 가능 | **P3 조건부**. 1천+ 정제 sample과 baseline eval 없이는 금지 |
| image OCR 고도화 | 현재 image path와 historical settlement image fixtures | Kimi K2.5/2.6 vision은 OCR-like table/chart 이해를 공식 지원 | **P2**. 별도 OCR 구매 전 structured vision eval/crop/multi-image 실험 |
| voice input | README/old roadmap backlog, current provider는 ASR 미사용 | MiniMax는 별도 Speech 2.8 API를 제공; Kimi는 ASR 미지원이라고 명시 | **P3**. privacy/permission/cost와 Korean WER eval 후 opt-in |
| N분의 1 정산 | 13-commit branch, deterministic matching tests와 fixture 존재 | 7.8k LOC를 처음부터 발명할 필요 없이 spec/test 자산을 회수 가능 | **P2/P3 재구축**. branch merge 금지, current ledger/tenant model 위 재작성 |
| 카드 청구/음수 지출 | 삭제된 P1 TODO와 settlement `accountImpactAmount` 설계 | ledger/transfer primitive 설계가 이미 일부 탐색됨 | **P2**. debt semantics P0 수정 후 double-entry/event model로 통합 |
| social login | 2026-03 custom domain 부재로 제거 | 현재 custom domain/Better Auth provider capability가 있다면 기술적으로 재평가 가능 | **조건부**. domain·redirect·account-linking·recovery 검증 없이는 보류 |

## 6단계 현대화 로드맵

### 0단계 — 증거 기준선 (1–2일)

- Node version/engines를 고정하고 clean `npm ci` 재현.
- `npm audit`, lockfile, direct/optional/dev advisory lane 분리.
- current DB schema/journal/RLS read-only snapshot과 backup 확보.
- auth/DB/LLM/native/store를 서로 다른 verification lane으로 기록.
- CI를 복구하기 전 broken governance scope를 결정: 공개 제품 check로 재작성하거나 script 제거.

**Exit**: clean checkout에서 type/lint/unit/migration check가 0 fail; DB와 runtime은 아직 별도 미검증으로 표시.

### 1단계 — P0 보안·정합성 (3–7일)

- account/category ownership checks + composite constraints.
- debt/asset balance semantics를 typed state machine 또는 ledger event로 분리.
- Android signing 회전/secret injection.
- destructive DB command environment lock.
- Next/Better Auth supported patch update.
- migration snapshots/baseline 복구.

**Exit**: disposable Postgres에서 two-tenant attack tests, debt matrix, reset guard, migrate-up test PASS.

### 2단계 — Boundary contracts와 idempotency (3–6일)

- 모든 Server Action/API에 shared runtime schema.
- DB check/partial unique/composite FK.
- recurring occurrence unique key.
- auto-apply를 render에서 제거하고 idempotent job/action으로 이동.
- typed public/internal errors와 raw error redaction.

**Exit**: invalid payload/property/fuzz tests와 concurrent recurring/budget tests PASS.

### 3단계 — LLM evaluation-first rewrite (4–8일)

- canonical `ParseResultSchema` + provider JSON Schema adapters.
- current Kimi K2.5/K2.6, MiniMax M2.5/M2.7, Fireworks endpoint availability를 golden corpus로 비교.
- deterministic single primary; runtime silent fallback/race 제거.
- request ID, model/prompt/schema version, token/cache/cost/error telemetry.
- request abort propagation.
- stable prompt prefix + data minimization.

**Exit**: accuracy/abstention/latency/cost threshold가 문서화되고 선택 모델이 replay 가능한 결과로 결정됨.

### 4단계 — 제품 신뢰/운영 (4–10일)

- CI: type/lint/unit/DB integration/build/scoped E2E/audit.
- export/backup before delete; password reset/email verification/session management.
- mobile budget entry와 navigation IA.
- security event retention/deletion and privacy processor matrix.
- health/readiness, deployment ref/env matrix, rollback/smoke.

**Exit**: source/local/CI/deploy/authenticated runtime 각 lane에 독립 증거 존재.

### 5단계 — PWA/native 정리 (3–8일)

- PWA를 실제 offline/install product로 만들지, manifest-only로 줄일지 결정.
- Capacitor dev/preview/prod config, bundle IDs, versioning, signing, backup/privacy policy.
- Android/iOS build + device smoke + store-console evidence.

**Exit**: web Ready를 native/store 완료로 오인하지 않고 각 artifact digest/version을 기록.

### 6단계 — 정산/카드/음성 확장 (별도 epic)

- settlement branch에서 pure fixtures/invariants만 추출.
- current tenant-safe ledger 위에 settlement/card transfer를 함께 설계.
- image/voice는 별도 consent·retention·provider eval.
- budget alert는 scheduler/push permission/quiet hours까지 한 계약으로 설계.

## 권장 KPI와 gate

### LLM

- field exact match: type/date/amount ≥ 99% on accepted simple fixtures.
- invalid schema rate = 0 under provider structured output; local parser rejection separately 집계.
- false accept OOD, false reject finance input을 별도 추적.
- P50/P95 end-to-end, vendor attempt count/request, prompt/output/cache tokens, cost/success.
- user correction rate와 save-without-edit rate.

### 데이터

- cross-tenant integration tests 100% reject.
- balance invariant replay mismatch = 0.
- recurring duplicate occurrence = 0 under concurrent calls.
- migration up from empty + representative old snapshot PASS.

### 제품/운영

- auth recovery success, export success, deletion completion evidence.
- CI required checks 100% enforced.
- web deploy, authenticated smoke, Android artifact, iOS artifact, store state를 별도 lane으로 표시.

## 검증 ledger와 제한

### 확인된 것

- current HEAD/origin main 동일.
- 165 reachable commits, unreachable object 없음.
- TypeScript/lint/unit current local PASS.
- migration/governance current local FAIL signatures.
- npm registry advisory/outdated 결과.
- public anonymous URL status와 response headers.
- official provider model/structured-output/cache 문서.

### 확인하지 않은 것

- 실제 운영 DB schema, RLS policy, migration ledger, backup.
- 교차 테넌트 exploit 실행.
- 실제 vendor API key/model list/cost/latency/output.
- authenticated production UI, transaction save, account balance, parse.
- Vercel deployment commit/env/log.
- Android/iOS build, signing, device, store submission/review.
- settlement branch build/test/live sample QA.
- 개인정보 처리방침의 법률 적합성.

## 실행한 핵심 명령과 결과 요약

```text
git rev-list --all --count
=> 165

git fsck --full --no-reflogs --unreachable
=> no output (unreachable 0)

git rev-list --left-right --count main...origin/codex/phase14-settlement-ui
=> 46 13

git rev-list --left-right --count main...origin/codex/docs-handoff-20260317
=> 23 8

node node_modules/typescript/bin/tsc --noEmit
=> exit 0

node node_modules/eslint/bin/eslint.js src eslint.config.mjs
=> exit 0; browsers data stale warning

node node_modules/vitest/vitest.mjs run
=> 4 files passed, 31 tests passed

node scripts/validate-governance.mjs
=> ENOENT scandir .claude/skills

node node_modules/drizzle-kit/bin.cjs check --config=drizzle.config.ts
=> invalid JSON, 0000_snapshot line 324

npm audit --json
=> 19 total: 2 critical, 11 high, 4 moderate, 2 low

anonymous curl HEAD/GET
=> tawny root 307 /login; manifest 200; sw 200; old root 500; both sitemap checks 404
```

## EXPAND MARKERS

- [ ] EXPAND: disposable two-user Postgres에서 account/category IDOR, debt balance direction, recurring concurrency를 실제 integration test로 검증한다.
- [ ] EXPAND: 운영 DB를 read-only introspection해 RLS, policies, roles, `drizzle.__drizzle_migrations`, latest backup을 현재 source와 대조한다.
- [ ] EXPAND: provider keys가 승인되면 Kimi/Fireworks/MiniMax model-list preflight와 비식별 golden eval을 실행해 model/routing 결정을 수치화한다.
- [ ] EXPAND: `origin/codex/phase14-settlement-ui`의 pure fixtures/invariants만 추려 current main 재구축 spec을 만든다. branch merge는 하지 않는다.
- [ ] EXPAND: authenticated production browser에서 mobile budget discoverability, parse cancel propagation, save feedback를 관찰한다.
- [ ] EXPAND: Android/iOS signing, artifact version, device smoke, Play/App Store console을 별도 release evidence lane으로 감사한다.
- [ ] EXPAND: 개인정보 국외 처리, provider retention, security-event retention, 탈퇴 삭제 문구를 법률/운영 담당자와 검토한다.
