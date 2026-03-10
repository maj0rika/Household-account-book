---
date: 2026-03-10
type: config
---

# MiniMax 텍스트 우선 라우팅과 이미지 Fireworks 유지

## 변경 내용

- 100자 이하 짧은 텍스트 입력은 `MiniMax -> Fireworks` 순서로 라우팅하도록 변경했다.
- 긴 텍스트/복수 거래는 기존처럼 Kimi 고성능 경로를 유지했다.
- 이미지 입력은 기존 정책을 유지해 `Fireworks 우선`, 세션 기준 3회 초과 시 `Kimi`로 전환되도록 보존했다.
- MiniMax 응답에 섞일 수 있는 `<think>` 블록을 JSON 추출 전에 제거해 파서가 깨지지 않게 했다.
- Fireworks 사용량 카운트는 이미지 경로에서만 차감되도록 분리해 텍스트 요청이 이미지 쿼터를 소모하지 않게 했다.

## 변경된 파일

- src/server/llm/client.ts
- src/server/llm/index.ts
- src/server/services/parse-core.ts
- .env.example
- docs/project-identity.md
- docs/history/2026-03-10-21-minimax-fireworks-kimi-routing.md
- docs/implementation-plan.md

## 결정 사항

- `단순 텍스트` 기준은 기존 정책과 동일하게 100자 이하로 유지한다.
- 텍스트 MiniMax 실패 시 Fireworks로만 폴백하고, 이미지 Fireworks 실패 시에만 Kimi 쿨다운 우회를 적용한다.
- MiniMax provider는 OpenAI 호환 엔드포인트를 사용하되, 응답 내 reasoning 블록은 애플리케이션 레벨에서 정리한다.

## 다음 할 일

- 실제 파싱 로그를 비교해 MiniMax 짧은 텍스트 성공률과 Fireworks 폴백 비율을 관찰한다.
