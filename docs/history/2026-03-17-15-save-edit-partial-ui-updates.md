---
date: 2026-03-17
type: fix
---

# 저장/수정 후 부분 UI 갱신 개선

## 변경 내용

- 거래/자산 저장 후 전체 리다이렉트 포커스 스크롤 대신 현재 화면 목록을 즉시 부분 갱신하도록 흐름을 정리했다;
- `AccountList`, `TransactionList`에 로컬 상태를 두고 생성/수정/삭제 결과를 낙관적으로 반영하도록 바꿨다;
- `PostActionBanner`의 `targetId` 기반 스크롤 대기 로직을 제거해 저장 후 쿼리 파라미터 정리와 배너 노출 역할만 남겼다;

## 변경된 파일

- `src/app/(dashboard)/assets/page.tsx`
- `src/app/(dashboard)/transactions/page.tsx`
- `src/components/assets/AccountList.tsx`
- `src/components/common/PostActionBanner.tsx`
- `src/components/dashboard/TransactionsLazySections.tsx`
- `src/components/transaction/TransactionList.tsx`

## 결정 사항

- 저장 직후 사용자가 보던 리스트를 바로 갱신하는 쪽이 Suspense 섹션 스크롤 복구보다 단순하고 안정적이라고 판단했다;
- 서버 재검증 전까지는 클라이언트 로컬 상태로 즉시 반영하고, 이후 서버 데이터가 들어오면 `useEffect`로 다시 동기화한다;
- 배너 컴포넌트는 스크롤 책임을 제거하고 성공 메시지 노출과 URL 정리에만 집중시켰다;
