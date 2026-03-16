---
date: 2026-03-16
type: fix
---

# Auth/Parse 보안 PR 리뷰 반영

## 변경 내용

- `src/app/api/parse/route.ts`의 JSON 텍스트 입력 검증 중복 블록을 제거해 흐름을 단순화
- `src/server/security/index.ts`의 rate limit 조회를 raw SQL에서 Drizzle `select(...).for("update")`로 변경
- PR 리뷰 반영 내용을 후속 기록으로 추가

## 변경된 파일

- src/app/api/parse/route.ts
- src/server/security/index.ts
- docs/history/2026-03-16-04-security-review-followup.md
- docs/pipeline-state/2026-03-16-04-security-review-followup.md
- docs/implementation-plan.md

## 결정 사항

- `parse` 라우트의 중복 검증은 이미지 경로와 텍스트 경로를 분리하는 편이 더 읽기 쉬워 즉시 정리
- row lock은 유지하되 ORM API로 통일해 타입 안정성과 코드 일관성을 높임

## 다음 할 일

- PR 코멘트에 반영 내용을 답변하고 가능한 범위에서 resolve 처리
