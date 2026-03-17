---
date: 2026-03-18
type: refactor
---

# LLM 텍스트 race를 Promise.any로 전환

## 변경 내용

- `src/server/services/parse-core.ts`의 텍스트 provider race를 수동 first-success 루프에서 `Promise.any` 기반 경쟁 제어로 전환했다;
- 승자 확정 후 패자 요청을 abort하고 `Promise.allSettled`로 정리하는 흐름으로 맞췄다;
- abort된 패자가 성공 케이스에서 실패 경고로 남지 않도록 로그 수집 조건을 보정했다;
- race 테스트 헬퍼도 같은 `Promise.any` 패턴으로 옮겨 실제 구현과 검증 모델을 일치시켰다;
- `Promise.any` 성공 조건, 실패 수집 이유, abort 정리 의도가 드러나도록 핵심 구간 주석을 보강했다;

## 변경된 파일

- src/server/services/parse-core.ts
- src/server/services/__tests__/text-race.test.ts
- docs/pipeline-state/2026-03-18-07-llm-promise-any-migration.md
- docs/history/2026-03-18-08-llm-promise-any-migration.md
- docs/implementation-plan.md

## 결정 사항

- 수동 루프 대신 `Promise.any`를 써서 첫 성공 응답 선택 의도를 표준 Promise 조합으로 명확히 표현했다;
- 실패 선택 규칙은 기존처럼 유지해 복구 불가능한 콘텐츠 에러를 우선하고, 승자 확정 뒤 abort된 패자는 실패 통계에서 제외했다;

## 다음 할 일

- 실제 다중 provider 환경에서 abort 타이밍과 로그 노이즈가 없는지 통합 경로에서 한 번 더 확인한다;
