---
date: 2026-03-17
type: config
---

# 개인 문서 참조 및 키워드 정리

## 변경 내용

- 공개 저장소에 남아 있던 개인 문서 관련 키워드와 참조를 정리했다.
- `implementation-plan` 히스토리 로그에서 개인 문서성 항목과 관련 링크를 제거했다.
- `.gitignore`, 가이드 문서, 브레인스토밍, TODO, 히스토리 문서의 표현을 일반화해 공개 저장소 노출 범위를 줄였다.

## 변경된 파일

- .gitignore
- AGENTS.md
- CLAUDE.md
- docs/brainstorms/2026-02-24-household-account-book-brainstorm.md
- docs/history/2026-03-10-03-maintainability-comments-pass.md
- docs/history/2026-03-10-21-parse-unified-dead-code-removal.md
- docs/history/2026-03-16-11-doc-sync-alignment.md
- docs/history/2026-03-17-04-private-doc-reference-cleanup.md
- docs/implementation-plan.md
- docs/pipeline-state/2026-03-16-11-doc-sync-alignment.md
- todos/001-ready-p1-credit-card-billing-and-negative-expense.md

## 결정 사항

- 공개 저장소에는 기능 구현과 직접 관련 없는 개인 문서 문맥을 남기지 않는다.
- 기존 개인 문서 관련 히스토리 파일은 현재 트리에서 제거하고, 구현과 직접 연결된 이력만 유지한다.

## 다음 할 일

- 개인 참고 자료는 공개 저장소와 분리된 경로 또는 비공개 저장소로 관리한다.
