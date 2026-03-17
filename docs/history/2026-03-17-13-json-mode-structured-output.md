---
date: 2026-03-17
type: perf
---

# JSON mode / structured output 적용

## 변경 내용

- LLM API 호출에 `response_format: { type: "json_object" }` 추가하여 모델이 순수 JSON만 반환하도록 강제
- Fireworks는 `json_schema`로 업그레이드 — 스키마 구조까지 강제하여 정확도 향상
- MiniMax temperature 0.5 → 1.0 (공식 권장값)
- 전 provider에 `max_tokens: 2048` 추가 — 불필요한 생성 방지 및 속도 향상
- JSON 파싱 전략을 `JSON.parse()` 직접 시도 → `extractJSON()` 폴백으로 변경
- 프롬프트에 "compact JSON, 설명 없이" 지시 추가하여 출력 토큰 절약
- 비전 API(이미지 파싱)는 JSON mode 미적용 유지

## 변경된 파일

- src/server/llm/client.ts — `LLMConfig` 인터페이스에 `max_tokens`, `json_schema` 타입 추가. provider별 최적 설정 반영
- src/server/llm/index.ts — API 호출에 `max_tokens` 전달, JSON 파싱 폴백 로직
- src/server/llm/prompt.ts — compact JSON 지시, 이미지 프롬프트 JSON 반환 명시

## 결정 사항

- MiniMax M2.5는 `temp 0.5 + json_object` 조합에서 정상 입력을 OOD로 거부하는 문제 → temp 1.0 (공식 권장)으로 해결 시도
- Fireworks는 `json_schema`를 공식 지원하므로 `json_object`보다 정확한 `json_schema` 적용
- 비전 API에서는 JSON mode 미적용 — Fireworks에서 비전 + JSON mode 조합 시 이미지 인식 실패 확인됨
- `extractJSON()`/`stripReasoningBlocks()`는 폴백으로 유지 (비전 API 등 JSON mode 미지원 케이스 대비)
- 콘텐츠 에러(OOD, 노이즈 판단)는 다른 provider에서도 같은 결과이므로 폴백 중단 (isRecoverableProviderFailure 체크)
