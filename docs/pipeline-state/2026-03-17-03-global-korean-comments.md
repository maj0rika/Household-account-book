## Pipeline State

### 요청 요약
- 저장소 전반의 TypeScript/TSX 코드에 한글 주석을 추가해 함수 사용처, 흐름 관계, 내부 요소 의미를 사람이 쉽게 추적할 수 있도록 정리한다;

### 수용 기준
- [x] 주요 함수/훅/컴포넌트/서버 로직 상단에 한글 주석이 추가된다;
- [x] 복잡한 함수는 호출 위치, 입력 의미, 출력 의미, 후속 흐름이 드러난다;
- [x] 함수 내부의 핵심 상태값, 분기, 임시 계산값에 추적 가능한 한글 주석이 추가된다;
- [x] 주석이 과도한 잡설이 아니라 실제 추적에 필요한 정보 중심으로 정리된다;
- [x] 변경 이력 문서와 파이프라인 상태 문서가 함께 기록된다;
- [x] 리뷰 게이트와 QA 게이트를 통과한다;

### 활성 Phase
- PM;
- FE;
- BE;
- QA;

### 스킵 Phase
- UXUI: 화면 설계 변경이 아니라 코드 가독성 강화 작업이므로 제외;
- Infra: 빌드/배포/환경설정 변경이 아니므로 제외;
- Deploy: 요청 범위에 없음;

### 승인 이력
- PM 계획 / 승인됨 / 전역 한글 주석 작업, 서브에이전트 적극 사용;
- FE 계획 / 승인됨 / 페이지·컴포넌트·공용 UI 파일 헤더 및 핵심 화면 주석 보강;
- BE 계획 / 승인됨 / 파싱·인증·보안·서버 액션 주석 보강;
- QA 계획 / 승인됨 / `npm run lint`, `npm run test` 실행;

### 변경 패킷
- FE / `src/app`, `src/components`, `src/lib`, `src/types` 전역 파일 헤더 추가 + 거래 페이지/공용 유틸 주석 보강 / 완료;
- BE / `src/app/api/parse/route.ts`, `src/server/actions/account.ts`, `src/server/actions/recurring.ts`, `src/server/auth.ts`, `src/server/security/policy.ts` 주석 보강 / 완료;
- Support / `next.config.ts`, `capacitor.config.ts`, `scripts/create-review-account.ts`, `scripts/encrypt-existing-data.ts`, `scripts/migrate-encrypt-accounts.ts`, `e2e/account-parse-rematch.spec.ts` 주석 보강 / 완료;
- Record / `docs/history/2026-03-17-03-global-korean-comments.md`, `docs/implementation-plan.md` 갱신 / 완료;

### 리뷰 이슈
- PASS / 코드-주석 정합성 수동 점검 결과 치명 이슈 없음;

### QA 상태
- PASS;
- 재시작 지점: 없음;

### PM 최종 판정
- PASS;
- 근거: 요청 범위 내 주석 보강 완료, 리뷰 이슈 없음, `npm run lint`와 `npm run test` 통과;

### 다음 액션
- 이후 신규 기능/수정 파일도 동일한 파일 헤더 + 함수 흐름 주석 톤을 유지;
