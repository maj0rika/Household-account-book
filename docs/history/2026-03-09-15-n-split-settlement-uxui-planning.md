---
date: 2026-03-09
phase: 14
type: feature
---

# N분의 1 정산 기능 UX/UI 설계

## 변경 내용

- `n/1 정산`을 거래 흐름 내부에서 발견하고 관리하는 UX 구조를 설계했다
- 모바일 하단 탭은 유지하고, `/transactions` 상단 `정산 요약 카드`와 거래 아이템의 `정산 배지`를 핵심 진입점으로 정했다
- 파싱 결과 시트에서 `거래 정보`와 `정산 정보`를 분리해 편집하는 2단 구조를 정의했다
- 총무와 참여자의 기본 플로우를 다르게 두고, 참여자에게는 `거래만 저장`을 기본값으로 두는 점진적 공개 원칙을 적용했다
- `/settlements` 전용 화면과 `SettlementDraftEditor`, `SettlementDigestCard`, `SettlementDetailSheet` 같은 구현 단위를 구체화했다

## 변경된 파일

- docs/brainstorms/2026-03-09-n-split-settlement-uxui.md
- docs/implementation-plan.md
- docs/history/2026-03-09-15-n-split-settlement-uxui-planning.md

## 결정 사항

- 정산은 초기에는 글로벌 하단 탭으로 승격하지 않는다
- 저장 전 수정은 기존 `ParseResultSheet`를 유지하되 정산 편집을 별도 컴포넌트로 분리한다
- 거래 리스트는 정보 과밀을 피하기 위해 `정산` 배지와 최소 보조 정보만 노출한다
- `/settlements` 페이지는 서버 렌더 기반으로 시작하고, 필터와 상태 토글만 클라이언트 상호작용으로 분리한다

## 다음 할 일

- BE Phase에서 `settlements` 스키마, 거래-정산 연결 모델, 계좌 영향 금액 분리 방식을 확정한다
- FE 구현 전 `ParsedTransaction` 확장 필드와 저장 액션의 요청/응답 구조를 정리한다
