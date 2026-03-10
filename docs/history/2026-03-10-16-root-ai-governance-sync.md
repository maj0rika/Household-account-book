---
date: 2026-03-10
type: config
---

# 루트 AI 지침과 파이프라인 거버넌스 동기화

## 변경 내용

- `AGENTS.md`와 `CLAUDE.md`에 승인형 파이프라인 거버넌스 규칙을 추가하고, 커밋 컨벤션을 포함해 같은 정책 세트로 맞춘다.
- `qa` 스킬에 `docs/pipeline-state/` 상태 파일 경로와 단독 실행 시 최소 상태 파일 생성 규칙을 명시한다.

## 변경된 파일

- AGENTS.md
- CLAUDE.md
- .claude/skills/qa/SKILL.md
- docs/implementation-plan.md

## 결정 사항

- 루트 AI 지침은 스킬 문서보다 상위 진입점이므로, 승인/리뷰/QA/상태 파일 규칙도 여기서 바로 보이게 해야 한다.
- `AGENTS.md`와 `CLAUDE.md`는 같은 저장소 운영 규칙을 가리키므로 드리프트를 줄이기 위해 동일한 핵심 정책을 유지한다.

## 다음 할 일

- 실제 작업 한 번을 `AGENTS.md`만 읽는 경로와 `CLAUDE.md`만 읽는 경로로 각각 수행해 동작 차이가 없는지 확인한다.
