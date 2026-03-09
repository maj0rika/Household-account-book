---
date: 2026-03-09
type: fix
---

# LLM 타임아웃 디버깅 경로 정리

## 변경 내용

- `src/components/transaction/NaturalInputBar.tsx`가 서버 액션 대신 `/api/parse` JSON 엔드포인트를 직접 호출하도록 바꿨다.
- 파싱 요청 취소 시 브라우저 `fetch`도 함께 abort되도록 `AbortController`를 연결했다.
- `src/app/api/parse/route.ts`가 JSON body의 `imageBase64`/`mimeType` 입력도 받아 텍스트/이미지 파싱을 모두 동일 JSON 응답 경로로 처리하도록 확장했다.
- `src/server/llm/index.ts`의 timeout 래퍼를 `AbortController` 기반으로 바꿔, 시간 초과 시 벤더 LLM 요청 자체도 중단되도록 정리했다.
- LLM 요청 성공/실패 시 provider, model, timeout, elapsed 시간, attempt를 서버 로그로 남기도록 추가했다.

## 변경된 파일

- src/components/transaction/NaturalInputBar.tsx
- src/app/api/parse/route.ts
- src/server/llm/index.ts
- docs/history/2026-03-09-08-llm-timeout-debugging-fix.md
- docs/implementation-plan.md

## 결정 사항

- 디버깅 가시성이 중요하므로 서버 액션 Flight 응답보다 `/api/parse`의 순수 JSON 응답을 우선 사용한다.
- timeout은 사용자 메시지만 바꾸는 수준이 아니라 실제 벤더 요청까지 abort해야 늦게 도착한 200 응답과 앱 상태가 어긋나지 않는다.

## 다음 할 일

- 서버 로그에서 provider별 실제 elapsed 시간을 비교해 timeout 상한값 재조정 여부를 판단한다.
