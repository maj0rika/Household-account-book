---
date: 2026-03-10
type: refactor
---

# Fireworks 설정 체크 표현 정리

## 변경 내용

- `canUseFireworks()`가 직접 `process.env.FIREWORKS_API_KEY`를 확인하던 코드를 `hasFireworks()` 재사용 방식으로 정리했다;
- Fireworks 사용 가능 여부 판단에서 "설정 존재"와 "세션별 사용 가능" 책임을 더 명확히 읽을 수 있게 했다;

## 변경된 파일

- src/server/services/parse-core.ts

## 결정 사항

- 동작은 바꾸지 않고, 동일 파일 안의 설정 체크 표현만 한 곳으로 맞췄다;
- provider 선택 정책이나 Fireworks 무료 사용량/쿨다운 규칙은 변경하지 않았다;

