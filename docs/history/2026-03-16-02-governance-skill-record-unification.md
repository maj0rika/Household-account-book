---
date: 2026-03-16
type: config
---

# 거버넌스·스킬·기록 체계 통합

## 변경 내용

- `.claude` 기준 승인형 파이프라인을 공식 원본으로 고정하고 `.agents` 스킬을 동기화한다;
- 히스토리 규칙과 파이프라인 상태 파일 규칙을 하나의 기준으로 정리한다;
- 거버넌스 자동 검증 스크립트와 CI 워크플로우를 추가한다;
- `vitest`가 Playwright E2E spec을 함께 수집하지 않도록 `vitest.config.ts`를 추가한다;

## 변경된 파일

- .agents/skills/
- .claude/skills/
- .github/workflows/quality.yml
- .gitignore
- docs/implementation-plan.md
- docs/pipeline-state/2026-03-10-18-trailing-whitespace-fix.md
- docs/pipeline-state/2026-03-10-19-fireworks-availability-check-refactor.md
- docs/pipeline-state/2026-03-10-20-minimax-env-key-slot.md
- docs/pipeline-state/2026-03-10-21-minimax-fireworks-kimi-routing.md
- docs/pipeline-state/2026-03-10-21-parse-unified-dead-code-removal.md
- docs/pipeline-state/2026-03-10-22-android-latest-build.md
- docs/pipeline-state/2026-03-16-02-governance-skill-record-unification.md
- docs/pipeline-state-template.md
- docs/pipeline-state/
- AGENTS.md
- CLAUDE.md
- package.json
- scripts/validate-governance.mjs
- vitest.config.ts

## 결정 사항

- `.claude`를 공식 거버넌스 원본으로 유지하고 `.agents`는 호환 레이어로 동기화한다;
- `.agents`와 `AGENTS.md`가 실제 저장소 자산으로 유지되도록 ignore 규칙을 제거한다;
- 신규 히스토리 `type`은 canonical 집합을 기준으로 하고, 레거시 값은 검증 스크립트에서만 허용한다;
- 기본 CI 게이트는 `tsc`, `build`, `vitest`, `governance`로 제한하고 E2E는 수동 검증으로 둔다;
- 현재 워크트리의 `src/server/db/schema.ts` 충돌 마커는 이번 작업 범위 밖이므로 해결하지 않고 검증 실패 원인으로만 기록한다;

## 다음 할 일

- 히스토리 인덱스와 상태 파일을 정규화하고 자동 검증이 통과하도록 맞춘다;
- `src/server/db/schema.ts` 충돌 마커가 정리되면 `npx tsc --noEmit`와 `npm run build`를 다시 실행한다;
