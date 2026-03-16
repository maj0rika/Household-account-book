---
date: 2026-03-16
type: fix
---

# Parse 유저 quota 차감 시점 및 운영 문서 수정

## 변경 내용

- `parse:user` rate limit 차감을 요청 shape 및 payload 검증 통과 이후로 이동
- invalid request가 유저 parse quota를 소모하지 않도록 조정
- 운영 문서에서 존재하지 않는 `blocked` 타입 안내를 제거하고 실제 anomaly 이벤트/metadata 기준으로 정정

## 변경된 파일

- src/app/api/parse/route.ts
- docs/security-hardening.md
- docs/history/2026-03-16-07-parse-user-quota-and-doc-fix.md
- docs/pipeline-state/2026-03-16-07-parse-user-quota-and-doc-fix.md
- docs/implementation-plan.md

## 결정 사항

- 공개 입력의 invalid request는 IP anomaly limiter가 담당하고, 인증 사용자 parse quota는 실제 유효 요청만 차감하도록 분리
- 운영 문서는 코드에서 실제 생성되는 이벤트 타입과 metadata 기준으로 맞춰야 모니터링 지표가 어긋나지 않음
