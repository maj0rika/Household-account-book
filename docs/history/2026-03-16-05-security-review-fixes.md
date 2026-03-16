---
date: 2026-03-16
type: fix
---

# Auth/Parse 보안 추가 리뷰 수정

## 변경 내용

- `consumeRateLimit()`의 최초 row 생성 경로를 baseline upsert 후 lock 조회 방식으로 바꿔 동시성 유니크 충돌 가능성을 제거
- JSON 이미지 입력에 strict base64 형식 검증을 추가해 비정상 payload를 LLM 호출 전에 차단
- IP anomaly 이벤트를 `origin_mismatch`, `unauthorized`, `suspicious_pattern`, `invalid_input`으로 구분 기록하도록 수정
- 보안 정책 테스트에 invalid base64 이미지 케이스를 추가

## 변경된 파일

- src/server/security/index.ts
- src/server/security/policy.ts
- src/app/api/parse/route.ts
- src/server/lib/__tests__/security.test.ts
- docs/history/2026-03-16-05-security-review-fixes.md
- docs/pipeline-state/2026-03-16-05-security-review-fixes.md
- docs/implementation-plan.md

## 결정 사항

- 경쟁 조건은 후행 catch보다 선행 upsert가 더 안정적이므로 row baseline을 먼저 확보한 뒤 `FOR UPDATE`로 이어가도록 설계
- 이미지 payload는 크기 제한만으로는 부족하므로 형식 검증을 정책 레이어에 편입
- anomaly 이벤트는 차단 여부와 별개로 원인 타입이 남아야 운영 관측성이 유지되므로 type/reason을 분리 유지

## 다음 할 일

- PR 리뷰 코멘트 답변과 resolve 반영
