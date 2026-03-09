---
date: 2026-03-09
phase: 14
type: feature
---

# Phase 14 정산 이력 직접 기록 UI 추가

## 변경 내용

- `/settlements` 상세 시트에서 총무는 멤버별 수금 기록, 참여자는 본인 송금 기록을 바로 남길 수 있는 입력 폼을 추가했다.
- 정산 기록 입력 시 금액, 자산 계좌, 메모를 함께 저장할 수 있게 연결했다.
- 총무 수금은 멤버 잔여 몫 초과를 막고, 참여자 송금은 남은 정산액 초과를 막는 서버 가드를 추가했다.

## 변경된 파일

- src/app/(dashboard)/settlements/page.tsx
- src/components/settlement/SettlementBoard.tsx
- src/components/settlement/SettlementDetailSheet.tsx
- src/server/actions/settlement.ts
- docs/implementation-plan.md

## 결정 사항

- 정산 이력 입력은 새 페이지를 만들지 않고 기존 `SettlementDetailSheet` 안에서 끝내서 정산 보드 흐름을 늘리지 않았다.
- 기록 액션은 `memberId` 단독 기준이 아니라 `settlementId + optional memberId`로 처리해 총무/참여자 플로우를 하나의 action으로 통합했다.
- 정산 이력은 진행률과 일치해야 하므로 FE 비활성화만 두지 않고 BE에서도 초과 수금/송금을 거부했다.

## 다음 할 일

- 카카오톡/토스 정산 스크린샷 이미지 파싱 초안을 연결한다.
- 정산 메시지/입금 알림 자동 파싱 후속 범위를 정리한다.
