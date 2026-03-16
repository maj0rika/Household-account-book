---
date: 2026-03-16
type: config
---

# 거버넌스 PR rebase 및 보안 회귀 복구

## 변경 내용

- 거버넌스 PR 브랜치를 `origin/main` 위로 rebase해 Auth/Parse 보안 하드닝 회귀를 제거했다;
- `quality.yml`에 CI용 최소 env를 job-level로 추가해 `DATABASE_URL` 및 Better Auth 필수 값 누락으로 인한 build 실패를 방지했다;
- `scripts/validate-governance.mjs`에 merge conflict marker 탐지를 추가해 문서와 워크플로우 파일의 충돌 잔재를 검증하도록 보강했다;

## 변경된 파일

- .github/workflows/quality.yml
- docs/history/2026-03-16-10-governance-pr-rebase-security-recovery.md
- docs/implementation-plan.md
- docs/pipeline-state/2026-03-16-10-governance-pr-rebase-security-recovery.md
- scripts/validate-governance.mjs

## 결정 사항

- 보안 회귀는 수동 패치 대신 `origin/main` rebase로 복구해 Auth/Parse 최신 기준선을 그대로 유지한다;
- CI는 실제 DB 연결이 아니라 import 단계 통과만 보장하면 되므로 더미 `DATABASE_URL`과 Better Auth env를 기본 주입한다;
- conflict marker는 히스토리/상태 문서뿐 아니라 `.github`와 거버넌스 스크립트까지 검사한다;

## 다음 할 일

- PR 스레드에 REV-01~REV-06 대응 결과를 최신 HEAD 기준으로 답변한다;
