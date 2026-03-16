---
date: 2026-03-16
type: fix
---

# Auth/Parse 보안 후속 회귀 수정

## 변경 내용

- 이미지 요청 quota를 payload 검증 이후에만 차감하도록 순서를 조정
- 공개 입력 IP limiter에서 IPv6를 /64 기준으로 정규화해 대역 회전 우회를 어렵게 조정
- 보안 테스트에 IPv6 정규화 케이스를 추가

## 변경된 파일

- src/app/api/parse/route.ts
- src/server/security/policy.ts
- src/server/lib/__tests__/security.test.ts
- docs/history/2026-03-16-06-security-followup-fixes.md
- docs/pipeline-state/2026-03-16-06-security-followup-fixes.md
- docs/implementation-plan.md

## 결정 사항

- 유효하지 않은 이미지 입력은 비용과 quota를 소모하지 않아야 하므로 validation 이후에만 세션 이미지 제한을 적용
- IP 기반 공개 입력 방어는 auth와 같은 방향으로 IPv6 대역 단위로 묶어야 운영 의도가 유지됨

## 다음 할 일

- PR 후속 리뷰 반영 여부 공유
