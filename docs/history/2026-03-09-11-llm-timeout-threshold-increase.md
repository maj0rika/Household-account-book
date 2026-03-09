---
date: 2026-03-09
type: fix
---

# LLM 타임아웃 상한 증가

## 변경 내용

- `src/server/services/parse-core.ts`의 텍스트 파싱 timeout을 길이별 `25/45/75초`에서 `45/70/100초`로 상향했다.
- 이미지 파싱 timeout을 길이별 `70/85/100초`에서 `90/110/120초`로 상향했다.
- 느린 provider 응답으로 인한 조기 timeout을 줄이기 위한 임시 완화 조치다.

## 변경된 파일

- src/server/services/parse-core.ts
- docs/history/2026-03-09-11-llm-timeout-threshold-increase.md
- docs/implementation-plan.md

## 결정 사항

- 현재 실패 원인은 `/api/parse` 라우트 자체보다 Fireworks 응답 지연에 가까우므로, 우선 timeout 상한을 늘려 사용자 요청이 조기 종료되지 않게 한다.
- provider 정책 자체를 바꾸기 전까지는 짧은 입력도 상대적으로 긴 대기 시간을 허용한다.

## 다음 할 일

- Fireworks 우선 정책을 유지할지, Kimi 우선이나 provider fallback 전략으로 전환할지 결정한다.
