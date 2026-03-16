## Pipeline State

### 요청 요약
- `.claude` 기준으로 스킬을 통합하고, 기록 규칙과 거버넌스 검증을 자동화한다;

### 수용 기준
- [ ] `.agents`와 `.claude` 대응 스킬이 동일한 내용으로 동기화된다;
- [ ] 히스토리 규칙과 상태 파일 규칙이 문서상 하나의 기준으로 정리된다;
- [ ] `docs/implementation-plan.md` 히스토리 로그에 누락된 기존 기록이 모두 보강된다;
- [ ] `scripts/validate-governance.mjs`가 현재 저장소 기준으로 통과한다;
- [ ] CI가 `tsc`, `build`, `vitest`, `governance`를 기본 게이트로 실행한다;

### 활성 Phase
- PM;
- Infra;

### 스킵 Phase
- UXUI: 제품 화면/인터랙션을 바꾸지 않는다;
- BE: 런타임 API, DB 스키마, 인증 로직은 바꾸지 않는다;
- FE: 제품 UI와 상태 관리 로직은 바꾸지 않는다;
- Deploy: 저장소 정비 작업이며 배포 승인 요청이 없다;

### 승인 이력
- PM 계획 / 승인됨 / 거버넌스·스킬·기록 체계 통합 계획 전체 범위;

### 변경 패킷
- PM / `.gitignore`, `CLAUDE.md`, `AGENTS.md`, `docs/implementation-plan.md`, `docs/pipeline-state-template.md`, `docs/pipeline-state/*`, `docs/history/2026-03-16-02-governance-skill-record-unification.md` / 규칙과 기록 정규화 완료;
- Infra / `scripts/validate-governance.mjs`, `package.json`, `.github/workflows/quality.yml`, `vitest.config.ts` / 자동 검증과 CI 게이트 추가 완료;
- Skills / `.claude/skills/*`, `.agents/skills/*` / `.agents`를 `.claude` 기준으로 동기화 완료;

### 리뷰 이슈
- 열린 이슈 0개;

### QA 상태
- FAIL;
- 재시작 지점: `src/server/db/schema.ts` 충돌 마커 정리 후 검증 재실행;

### PM 최종 판정
- RESTART;
- 근거: 거버넌스 정비 자체는 완료됐지만 `npx tsc --noEmit`, `npm run build`가 기존 워크트리의 `src/server/db/schema.ts` 충돌 마커 때문에 실패해 최종 PASS를 줄 수 없다;

### 다음 액션
- `src/server/db/schema.ts`의 충돌 마커를 정리한 뒤 `npx tsc --noEmit`, `npm run build`, `npm test`, `npm run check:governance`를 순서대로 재실행한다;
