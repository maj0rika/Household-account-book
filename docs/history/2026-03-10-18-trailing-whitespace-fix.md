---
date: 2026-03-10
type: fix
---

# git diff --check trailing whitespace 실패 복구

## 변경 내용

- `git diff --check`에서 잡히던 소스 파일 3개의 trailing whitespace를 제거했다;
- 주석 내용과 런타임 로직은 바꾸지 않고 줄 끝 공백만 정리했다;

## 변경된 파일

- src/components/transaction/NaturalInputBar.tsx
- src/server/actions/transaction.ts
- src/server/services/parse-core.ts
- docs/pipeline-state/2026-03-10-18-trailing-whitespace-fix.md
- docs/history/2026-03-10-18-trailing-whitespace-fix.md
- docs/implementation-plan.md

## 결정 사항

- 이미 진행 중인 다른 워킹트리 변경은 건드리지 않고, `git diff --check`가 지적한 공백 문제만 최소 범위로 수정했다;
- 검증은 요청 목적에 맞춰 `git diff --check` 재실행으로 완료 여부를 확인했다;
