---
date: 2026-03-09
type: fix
---

# Fireworks 실패 시 Kimi 자동 폴백

## 변경 내용

- `src/server/services/parse-core.ts`에서 Fireworks를 1차 provider로 선택한 요청이 실패하면 같은 요청 안에서 Kimi로 자동 폴백하도록 바꿨다.
- timeout, 네트워크 오류, 비정상 응답 같은 복구 가능한 Fireworks 실패는 세션 단위 쿨다운을 걸어, 일정 시간 같은 실패를 반복하지 않게 했다.
- Fireworks가 실패하더라도 Kimi가 성공하면 사용자에게는 정상 파싱 결과를 반환하도록 정리했다.

## 변경된 파일

- src/server/services/parse-core.ts
- docs/history/2026-03-09-12-fireworks-kimi-fallback.md
- docs/implementation-plan.md

## 결정 사항

- 자동 재시도는 제거했지만, provider 간 폴백은 사용자 성공률을 높이는 방향이므로 유지한다.
- Fireworks가 한 번 timeout 난 세션에서 매 요청마다 같은 실패를 반복하지 않도록, 복구 가능한 실패에는 짧은 서킷 브레이커 성격의 쿨다운을 적용한다.

## 다음 할 일

- Fireworks 실패율과 Kimi 폴백 성공률을 로그로 비교해 기본 provider 우선순위를 재조정할지 판단한다.
