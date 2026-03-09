---
date: 2026-03-09
phase: 14
type: feature
---

# N분의 1 정산 기능 PM 플래닝 정리

## 변경 내용

- `Phase 14`의 `N분의 1 정산` 요구를 PM 기준으로 재정의했다
- 가계부 본체 금액은 `내 부담금`, 총액/참여자/미수금은 별도 정산 레이어로 분리하는 원칙을 명시했다
- 자연어 입력, 이미지 스크린샷 파싱, 저장 전 수정, 저장 후 정산 추적까지 포함한 범위를 문서화했다
- 계좌 기능을 함께 쓰는 경우 `가계부 금액`과 `실제 계좌 영향 금액`을 분리해야 한다는 리스크를 기록했다

## 변경된 파일

- docs/brainstorms/2026-03-09-n-split-settlement-planning.md
- docs/implementation-plan.md
- docs/history/2026-03-09-14-n-split-settlement-planning.md

## 결정 사항

- `transactions.amount`는 계속 `내가 최종 부담하는 금액`으로 유지한다
- `총액`, `내 몫`, `인원 수`, `참여자 상태`는 `settlements` 계층에서 관리한다
- 카카오톡/토스 등 외부 서비스 스크린샷은 기존 이미지 파싱 파이프라인을 확장해 지원한다
- AI 파싱은 초안 생성기로 두고, 저장 전후 수정을 필수 흐름으로 둔다

## 다음 할 일

- UX/UI Phase에서 정산 포함 거래의 Bottom Sheet 편집 흐름과 정산 대시보드 정보 구조를 설계한다
- BE Phase에서 `settlements` 스키마 초안과 계좌 영향 금액 분리 방식을 확정한다
