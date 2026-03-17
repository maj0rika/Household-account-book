---
date: 2026-03-17
type: perf
---

# JSON mode / structured output 적용

## 변경 내용

- LLM API 호출에 `response_format: { type: "json_object" }` 추가하여 모델이 순수 JSON만 반환하도록 강제
- 세 provider(Kimi, MiniMax, Fireworks) 모두에 공통 적용
- JSON 파싱 전략을 `JSON.parse()` 직접 시도 → `extractJSON()` 폴백으로 변경
- 프롬프트에서 "JSON만 반환" 반복 지시를 경량화하여 토큰 절약

## 변경된 파일

- src/server/llm/client.ts — `LLMConfig.response_format` 필드 추가, 3개 provider 설정에 `json_object` 적용
- src/server/llm/index.ts — API 호출에 `response_format` 전달, JSON 파싱 폴백 로직 추가
- src/server/llm/prompt.ts — 포맷 강조 문구 경량화 (시스템/유저/이미지 프롬프트)

## 결정 사항

- `json_schema`(strict mode)는 provider별 구문 차이가 있어 `json_object`만 적용
- `extractJSON()`/`stripReasoningBlocks()`는 삭제하지 않고 폴백으로 유지 (비전 API 등 JSON mode 미지원 케이스 대비)
- 프롬프트의 출력 스키마 설명은 유지 (`json_object`는 구조까지 강제하지 않으므로)
- **이미지 파싱(비전 API)에서는 JSON mode 미적용** — Fireworks에서 비전 + JSON mode 조합 시 이미지 인식 실패 확인됨. 이미지 프롬프트에는 "JSON 반환" 지시를 명시적으로 유지
