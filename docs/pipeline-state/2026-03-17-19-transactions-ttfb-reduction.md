## Pipeline State

### 요청 요약

- `/login` 이후 `/transactions` 진입 시 발생하는 서버 대기 시간을 줄이기 위해 리다이렉트 경로와 초기 데이터 블로커를 정리한다;

### 수용 기준

- [ ] 로그인/회원가입 성공 후 `/` 경유 없이 `/transactions`로 직접 이동한다;
- [ ] 로그인된 사용자가 `/login`, `/register`에 들어올 때 클라이언트 세션 확인 스피너 없이 서버에서 즉시 `/transactions`로 이동한다;
- [ ] 대시보드 레이아웃의 전역 입력 초기 데이터가 첫 HTML 바이트를 막지 않도록 분리된다;
- [ ] 같은 요청 안에서 `getServerSession()` 중복 조회가 줄어든다;
- [ ] 변경 기록이 `docs/history/`와 `docs/implementation-plan.md`에 반영된다;

### 활성 Phase

- PM;
- FE;
- QA;

### 스킵 Phase

- UXUI: 화면 구조 자체를 바꾸는 작업이 아니라 성능 병목 제거다;
- BE: DB 스키마나 API 계약 변경이 없다;
- Infra: 배포/환경 설정 변경이 없다;

### 승인 이력

- PM 계획 / 승인됨 / `/transactions` 초기 응답 병목 제거와 인증 리다이렉트 단순화;
- FE 계획 / 승인됨 / auth redirect 단순화, 대시보드 레이아웃 스트리밍 분리, 요청 단위 세션 캐시;
- QA 계획 / 승인됨 / 정적 검증과 익명 라우트 접근 시나리오 확인;

### 변경 패킷

- FE / `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/app/(dashboard)/layout.tsx`, `src/server/auth.ts` / 로그인·회원가입 직행 리다이렉트, auth 서버 리다이렉트, `UnifiedInputSection` Suspense 분리, `getServerSession()` 요청 단위 캐시 적용;

### 리뷰 이슈

- PASS / 열린 이슈 0개;
- WARN / `src/server/auth.ts`의 request-scoped cache는 만료 쿠키·로그아웃 직후 재진입 시 수동 회귀 확인이 필요하다;
- WARN / `src/app/(dashboard)/layout.tsx`의 입력 바는 cold load에서 첫 페인트 직후 잠시 늦게 나타날 수 있어 UX 수동 확인이 필요하다;
- WARN / 비로그인 `HEAD /transactions`는 최종 307으로 보호되지만 dev 로그에 하위 섹션 auth 예외가 함께 찍혀 보호 경로 렌더 순서 점검이 추가로 필요하다;

### QA 상태

- PASS;
- 근거: `npm run lint` 통과, `npx tsc --noEmit` 통과, 임시 dev 서버(`localhost:3001`)에서 `/login` 200, `/register` 200, 비로그인 `/transactions` -> `/login` 307 확인;
- 재시작 지점: 없음;

### PM 최종 판정

- PASS;
- 근거: 요청 범위인 auth redirect 단순화, 레이아웃 초기 블로커 분리, 요청 단위 세션 조회 재사용이 모두 반영됐고 정적/익명 시나리오 검증을 통과했다;

### 다음 액션

- 로그인된 상태 `/login`, `/register` 재진입과 로그인/회원가입 성공 직후 `/transactions` 직행은 브라우저에서 추가 수동 확인한다;
