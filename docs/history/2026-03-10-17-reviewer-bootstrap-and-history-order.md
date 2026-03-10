---
date: 2026-03-10
type: config
---

# reviewer 부트스트랩 규약 추가와 히스토리 로그 정렬

## 변경 내용

- `reviewer` 단독 호출 시 `docs/pipeline-state/YYYY-MM-DD-NN-reviewer-<topic>.md` 최소 상태 파일을 먼저 생성하도록 규약을 추가했다;
- `Pipeline State` 템플릿과 저장 규약 문서에 파이프라인 외부 `review`, `reviewer`, `qa` 단독 실행 시 상태 파일 생성 주체를 명시했다;
- 서브에이전트 파이프라인 문서에 단독 실행 시 최소 상태 파일 부트스트랩 규칙을 추가했다;
- `docs/implementation-plan.md` 히스토리 로그를 날짜 내 순번 기준으로 재정렬하고 이번 변경 기록을 추가했다;

## 변경된 파일

- .claude/skills/reviewer/SKILL.md
- docs/pipeline-state-template.md
- docs/pipeline-state/README.md
- docs/subagent-pipeline.md
- docs/implementation-plan.md
- docs/history/2026-03-10-17-reviewer-bootstrap-and-history-order.md

## 결정 사항

- `reviewer` 직접 호출을 허용하는 대신 시작 상태를 표준화해 QA/PM/Deploy와 같은 후속 게이트가 같은 근거 문서를 이어받도록 했다;
- 상태 파일 생성 규칙은 PM 중심 원칙을 유지하되, 파이프라인 외부 예외로 `review`, `reviewer`, `qa`가 최소 상태 파일을 만들 수 있게 정리했다;
- 히스토리 로그는 같은 날짜 내에서 파일명 순번 기준으로 정렬해 운영 추적성을 유지한다;
