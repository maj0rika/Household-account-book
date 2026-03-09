---
date: 2026-03-09
type: fix
---

# LLM 자동 재시도 제거

## 변경 내용

- `src/server/llm/index.ts`의 텍스트/이미지 파싱에서 내부 `for` 재시도 루프를 제거했다.
- 이제 사용자 1회 파싱 요청은 벤더 LLM 1회 호출만 수행한다.
- timeout, OOD 거부, 응답 포맷 오류가 발생해도 자동으로 두 번째 API 호출을 보내지 않도록 정리했다.

## 변경된 파일

- src/server/llm/index.ts
- docs/history/2026-03-09-09-llm-auto-retry-removal.md
- docs/implementation-plan.md

## 결정 사항

- 파싱 실패 시 즉시 재시도하면 비용과 지연만 늘고, timeout 상황에서는 동일 실패를 한 번 더 반복할 가능성이 높다.
- 재시도는 시스템이 숨겨서 수행하기보다 사용자가 `다시 시도`를 눌러 명시적으로 실행하는 편이 관찰성과 비용 통제에 유리하다.

## 다음 할 일

- Fireworks provider의 실제 응답 시간을 로그로 확인해 short input timeout 상한(25초) 자체를 조정할지 판단한다.
