---
date: 2026-03-18
type: remove
---

# GitHub Quality 액션 제거

## 변경 내용

- `.github/workflows/quality.yml`을 삭제해 `main` push와 `pull_request`에서 실행되던 `Quality` GitHub Actions 워크플로를 제거했다;
- 제거 사실과 검증 결과를 파이프라인 상태 문서에 기록했다;
- 구현 계획서 하단 히스토리 로그에 이번 변경을 추가했다;

## 변경된 파일

- .github/workflows/quality.yml
- docs/pipeline-state/2026-03-18-32-remove-quality-action.md
- docs/history/2026-03-18-32-remove-quality-action.md
- docs/implementation-plan.md

## 결정 사항

- 현재 요청은 액션 제거 자체가 목표이므로, 기존 `Type check`, `Build`, `Unit test`, `Governance check`를 다른 워크플로로 이전하지 않고 먼저 제거만 반영한다;
- 사용자 워크트리에 존재하던 미추적 문서는 이번 변경과 무관하므로 그대로 둔다;

## 다음 할 일

- 필요하면 후속 작업에서 새 CI 정책이나 대체 워크플로를 별도 설계한다;
