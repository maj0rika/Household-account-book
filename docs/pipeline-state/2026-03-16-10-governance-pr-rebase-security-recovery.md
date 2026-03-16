## Pipeline State

### 요청 요약
- 거버넌스 PR을 `origin/main` 위로 재배치해 보안 회귀를 제거하고 CI/거버넌스 검증을 보강한다;

### 수용 기준
- [x] `main`의 Auth/Parse 보안 하드닝이 PR 브랜치에 복원된다;
- [x] `quality.yml`에 CI용 최소 env가 job-level로 주입된다;
- [x] `validate-governance`가 conflict marker를 실패 처리한다;
- [x] 이번 작업이 `docs/history/`와 `docs/pipeline-state/`에 기록된다;

### 활성 Phase
- PM;
- Infra;

### 스킵 Phase
- UXUI: 제품 화면/인터랙션을 새로 설계하지 않는다;
- BE: 신규 기능 추가가 아니라 `main` 기준선 복구가 목적이다;
- FE: 신규 UI 구현 없이 `main`의 최신 보안 상태를 유지한다;
- Deploy: 리뷰 대응 단계이며 배포 범위가 아니다;

### 승인 이력
- PM 계획 / 승인됨 / 보안 회귀 복구 + CI env + conflict marker 검증 범위;

### 변경 패킷
- PM / `docs/history/2026-03-16-10-governance-pr-rebase-security-recovery.md`, `docs/implementation-plan.md`, `docs/pipeline-state/2026-03-16-10-governance-pr-rebase-security-recovery.md` / rebase 이후 기록 정리;
- Infra / `.github/workflows/quality.yml`, `scripts/validate-governance.mjs` / CI env 주입과 conflict marker 탐지 추가;

### 리뷰 이슈
- REV-01 / BLOCKER / CLOSED / rebase로 parse API 보안 하드닝이 `main` 기준으로 복원되었다;
- REV-02 / BLOCKER / CLOSED / rebase로 Better Auth rate limit과 session minimization이 `main` 기준으로 복원되었다;
- REV-03 / BLOCKER / CLOSED / `quality.yml`에 최소 env를 주입해 build-safe CI를 구성했다;
- REV-04 / BLOCKER / CLOSED / conflict marker를 제거하고 governance checker에 marker 탐지를 추가했다;
- REV-05 / WARN / CLOSED / `check-email` 제거 상태와 generic register error 흐름을 유지한다;
- REV-06 / WARN / CLOSED / auth route와 login/register UI의 raw error 노출이 `main` 기준으로 제거되었다;

### QA 상태
- PASS;
- 재시작 지점: 없음;

### PM 최종 판정
- PASS;
- 근거: 보안 회귀가 `main` 기준으로 제거되고, CI와 거버넌스 검증도 이번 PR 범위에 맞게 보강되었다;

### 다음 액션
- 정적 비교와 검증 명령을 실행한 뒤 PR 스레드에 항목별로 답변한다;
