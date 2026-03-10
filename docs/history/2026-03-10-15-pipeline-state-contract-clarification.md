---
date: 2026-03-10
type: config
---

# 파이프라인 상태 계약 명확화

## 변경 내용

- `Pipeline State`의 실제 저장 위치와 파일명 규약을 `docs/pipeline-state/` 기준으로 고정한다.
- `uxui`, `be`, `fe`, `infra`, `review`, `reviewer`, `deploy` 스킬에 상태 읽기/갱신 의무를 추가한다.
- `Review`를 선택 가능한 실행 Phase가 아니라 변경 Phase 사이의 게이트 오케스트레이터로 정리한다.

## 변경된 파일

- .claude/skills/pipeline/SKILL.md
- .claude/skills/pm/SKILL.md
- .claude/skills/uxui/SKILL.md
- .claude/skills/be/SKILL.md
- .claude/skills/fe/SKILL.md
- .claude/skills/infra/SKILL.md
- .claude/skills/review/SKILL.md
- .claude/skills/reviewer/SKILL.md
- .claude/skills/deploy/SKILL.md
- docs/subagent-pipeline.md
- docs/pipeline-state-template.md
- docs/pipeline-state/README.md
- docs/implementation-plan.md

## 결정 사항

- 상태 추적 문서는 템플릿만으로는 부족하고, 실제 파일 경로 규약이 있어야 게이트 근거가 안정된다.
- 하위 스킬이 상태 문서를 읽고 갱신해야 PM과 Deploy의 최종 판정이 서술형 대화에 의존하지 않는다.
- Review는 활성 Phase 목록에 넣기보다 자동 호출되는 게이트로 모델링하는 편이 해석 충돌이 적다.

## 다음 할 일

- 실제 기능 작업에서 `docs/pipeline-state/` 파일 생성과 갱신이 과도한 절차가 아닌지 운영 감각을 한 번 더 확인한다.
