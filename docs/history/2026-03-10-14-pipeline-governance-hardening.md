---
date: 2026-03-10
type: config
---

# 파이프라인 거버넌스 하드닝

## 변경 내용

- 승인형 `pipeline`이 실제 단일 진입점으로 동작하도록 QA 하드 게이트, 조건부 Phase 활성화, 공용 상태 아티팩트 규칙을 보강한다.
- `deploy` 스킬이 새 파이프라인을 우회하지 못하도록, `pipeline PASS` 이후 배포 전용 스킬로 재정의한다.
- `pm`, `qa`, `review`, 운영 문서에 승인/재시작/이슈 추적 규칙을 추가한다.

## 변경된 파일

- .claude/skills/pipeline/SKILL.md
- .claude/skills/pm/SKILL.md
- .claude/skills/qa/SKILL.md
- .claude/skills/review/SKILL.md
- .claude/skills/reviewer/SKILL.md
- .claude/skills/deploy/SKILL.md
- docs/subagent-pipeline.md
- docs/pipeline-state-template.md
- docs/implementation-plan.md

## 결정 사항

- QA는 reviewer와 동일한 수준의 하드 게이트로 다뤄야 최종 PM 판정이 형식적 승인으로 흐르지 않는다.
- 종합 스킬은 모든 Phase를 강제하는 워터폴보다, PM이 활성화한 Phase만 실행하는 조건부 오케스트레이터가 더 실용적이다.
- 승인 이력과 열린 리뷰 항목은 공용 상태 템플릿에 모아야 장기 루프에서 누락이 줄어든다.

## 다음 할 일

- 실제 기능 작업에서 상태 템플릿이 과도한 부담 없이 유지되는지 한 차례 운영 검증한다.
