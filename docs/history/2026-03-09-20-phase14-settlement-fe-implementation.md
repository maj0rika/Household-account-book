---
date: 2026-03-09
phase: 14
type: feature
---

# Phase 14 정산 기능 FE 구현

## 변경 내용

- `/transactions` 상단에 정산 요약 카드를 추가해 진행 중 정산을 거래 화면에서 다시 발견할 수 있게 했다;
- 파싱 결과 시트에 `SettlementDraftEditor`를 붙여 총액, 내 몫, 인원, 역할, 참여자 초안을 저장 전에 수정할 수 있게 했다;
- 참여자 정산은 기본 `거래만 저장`으로 두고, 총무 정산은 기본 `정산 포함`으로 두어 UX 기본값을 분리했다;
- 거래 리스트와 거래 수정 시트에 정산 배지/정산 상세 진입을 추가하고, 신규 `/settlements` 보드와 상세 시트를 구현했다;
- `/settlements` 상세 시트에서 멤버 완료 처리와 정산 이력 확인이 가능하도록 연결했다;

## 변경된 파일

- `src/app/(dashboard)/transactions/page.tsx`
- `src/app/(dashboard)/settlements/page.tsx`
- `src/components/dashboard/TransactionsLazySections.tsx`
- `src/components/settlement/SettlementDigestCard.tsx`
- `src/components/settlement/SettlementBoard.tsx`
- `src/components/settlement/SettlementDetailSheet.tsx`
- `src/components/settlement/SettlementDraftEditor.tsx`
- `src/components/transaction/ParseResultSheet.tsx`
- `src/components/transaction/FilterableTransactionList.tsx`
- `src/components/transaction/TransactionList.tsx`
- `src/components/transaction/TransactionItemContent.tsx`
- `src/components/transaction/TransactionEditSheet.tsx`
- `docs/implementation-plan.md`
- `docs/history/2026-03-09-20-phase14-settlement-fe-implementation.md`

## 결정 사항

- 정산은 모바일 하단 탭이나 사이드바가 아니라 거래 화면의 요약 카드와 거래 항목 배지에서 진입한다;
- 저장 전 정산 추적 여부는 거래 데이터와 별도 상태로 관리해, 참여자 기본값 `거래만 저장`을 유지하면서 초안 자체는 잃지 않게 했다;
- 거래 리스트와 월 요약은 계속 `transactions.amount`만 보여주고, `총액`과 `미수/미지급`은 정산 컴포넌트 안에서만 노출한다;
- 거래 수정 시트에는 정산 전체 편집을 넣지 않고 `/settlements` 상세로 보내는 연결만 둬서 기존 거래 편집 밀도를 유지한다;

## 다음 할 일

- 참여자 정산의 송금 기록 입력 UI와 `recordSettlementTransfer` 연결을 추가한다;
- 카카오톡/토스 이미지 파싱 결과에서 서비스 배지와 정산 초안 편집 흐름을 더 다듬는다;
- `/settlements` 보드의 세그먼트와 카드 액션을 더 촘촘하게 다듬고 통합 테스트를 보강한다;
