---
date: 2026-03-17
type: docs
---

# 구현 계획 단일 기준 문서화

## 변경 내용

- `docs/implementation-plan.md`를 이 저장소의 단일 계획 문서로 재정의하고, 완료/확장 Phase와 backlog/결정 로그를 한 문서에서 읽을 수 있게 통합했다;
- `docs/roadmap-v2-todo-phase-plan.md`는 기존 링크 호환을 유지하는 레거시 안내 문서로 축소하고, 기준 문서가 `implementation-plan`임을 명시했다;
- `README.md`와 `docs/project-identity.md`에 계획 문서의 단일 기준 원칙을 반영했다;

## 변경된 파일

- docs/history/2026-03-17-23-implementation-plan-unification.md
- docs/pipeline-state/2026-03-17-23-implementation-plan-unification.md
- docs/implementation-plan.md
- docs/roadmap-v2-todo-phase-plan.md
- README.md
- docs/project-identity.md

## 결정 사항

- 앞으로 계획, backlog, 운영 메모, 결정 로그는 `docs/implementation-plan.md` 한 곳에서 관리한다;
- `docs/roadmap-v2-todo-phase-plan.md`는 삭제하지 않고, 과거 히스토리와 TODO 링크 호환을 위한 포인터 문서로 유지한다;
- backlog 식별자(`TX`, `PF`, `AI`, `DM`, `AN`, `OPS`, `SEC`)와 장기 `Phase`는 그대로 유지해 기존 기록과 구현 맥락을 잃지 않도록 한다;

## 다음 할 일

- 새 backlog 항목은 `implementation-plan`의 통합 backlog 섹션에만 추가한다;
- 기존 문서나 TODO에서 `roadmap-v2`를 새 기준 문서처럼 참조하는 패턴이 남아 있으면 점진적으로 `implementation-plan`으로 정리한다;
