---
date: 2026-03-09
type: fix
---

# Drizzle legacy migration repair 추가

## 변경 내용

- Better Auth 전환 이후 로컬 DB에 `0002~0007` 구조는 반영됐지만 Drizzle 마이그레이션 이력이 비어 있는 경우를 복구하는 스크립트를 추가했다.
- `db:migrate` 실행 전에 legacy migration repair를 먼저 돌리도록 변경했다.
- 실제 로컬 DB에도 repair 후 `0008` 마이그레이션을 적용해 `settlements` 관련 테이블과 `transactions.account_impact_amount`를 생성했다.

## 변경된 파일

- scripts/repair-drizzle-migrations.ts
- package.json
- docs/implementation-plan.md

## 결정 사항

- 사용자 데이터가 있는 로컬 DB를 초기화하지 않고 복구해야 하므로, 스키마 시그니처를 확인한 뒤 누락된 migration row만 backfill하는 방식으로 처리했다.
- 일반적인 신규 DB에는 영향을 주지 않도록, legacy partial state가 감지될 때만 repair가 동작하게 제한했다.
