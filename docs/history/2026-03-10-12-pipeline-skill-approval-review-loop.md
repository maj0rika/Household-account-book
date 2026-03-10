---
date: 2026-03-10
type: config
---

# 파이프라인 스킬 승인 게이트 및 리뷰 루프 재설계

## 변경 내용

- `pipeline` 스킬을 계획 우선, 사용자 승인 필수, 리뷰어-수정자 반복 루프, 최종 PM 재검증 구조로 재정의한다.
- `pm`, `uxui`, `be`, `fe`, `infra`, `qa`, `review` 스킬의 시작 절차를 계획 제시 후 승인 대기로 통일한다.
- 코드 수정 단계마다 독립적인 `reviewer` 스킬을 호출할 수 있도록 추가하고, 운영 문서와 연결한다.

## 변경된 파일

- .claude/skills/pipeline/SKILL.md
- .claude/skills/pm/SKILL.md
- .claude/skills/uxui/SKILL.md
- .claude/skills/be/SKILL.md
- .claude/skills/fe/SKILL.md
- .claude/skills/infra/SKILL.md
- .claude/skills/qa/SKILL.md
- .claude/skills/review/SKILL.md
- .claude/skills/reviewer/SKILL.md
- docs/subagent-pipeline.md
- docs/implementation-plan.md

## 결정 사항

- 리뷰는 커밋/푸시와 분리된 독립 게이트로 두어야 수정자와 리뷰어 간 반복 왕복이 가능하다.
- 최종 품질 판단은 초기 요구사항을 가장 잘 보존하는 `pm`이 다시 수행해야 파이프라인 재시작 기준이 명확해진다.

## 다음 할 일

- 새 `reviewer` 스킬과 PM 재검증 루프를 실제 작업에서 한 차례 검증해 운영상 빈틈이 없는지 확인한다.
