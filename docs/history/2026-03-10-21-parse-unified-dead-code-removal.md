---
date: 2026-03-10
type: remove
---

# parse-unified dead code 제거

## 변경 내용

- `src/server/actions/parse-unified.ts`를 삭제했다;
- `docs/implementation-plan.md`를 `/api/parse` 단일 진입점 기준으로 정리했다;

## 변경된 파일

- src/server/actions/parse-unified.ts
- docs/implementation-plan.md
- docs/pipeline-state/2026-03-10-21-parse-unified-dead-code-removal.md

## 결정 사항

- 웹 파싱 요청은 이미 `NaturalInputBar`가 `/api/parse`만 호출하므로 `parse-unified.ts`는 유지 가치가 없다;
- dead code 삭제와 함께 면접/설계 문서의 stale 설명을 정리해 코드-문서 불일치를 줄인다;
