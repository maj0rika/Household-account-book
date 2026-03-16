# Parse 유저 quota 및 운영 문서 수정 상태

## Phase 1: PM

- 범위: parse:user 차감 시점 조정, 운영 문서 정정
- 목표: invalid request로 인한 정상 사용자 429 회귀 제거, 운영 지표 정합성 확보

## Phase 2: BE

- `parse:user` limiter를 shape/payload 검증 이후로 이동

## Phase 3: Record

- `docs/security-hardening.md`를 실제 이벤트 타입 기준으로 정정
- `docs/history/2026-03-16-07-parse-user-quota-and-doc-fix.md` 생성
