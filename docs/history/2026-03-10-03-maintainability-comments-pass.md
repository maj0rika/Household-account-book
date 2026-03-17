---
date: 2026-03-10
type: refactor
---

# 핵심 흐름 유지보수 주석 보강

## 변경 내용

- 파싱 오케스트레이션, 거래 저장, 시트 오케스트레이션, 입력 전처리 흐름에 유지보수용 주석을 보강했다.
- 루트 리다이렉트, 대시보드 레이아웃, 인증 경계, 전역 수동 입력 다이얼로그 등 상위 진입점에도 역할 설명을 추가했다.
- 복잡한 분기에서 어떤 불변조건을 지키는지와 어떤 실패 시나리오를 방어하는지 드러나도록 정리했다.
- 별도 개인용 문서는 건드리지 않고, 코드 자체에는 실제 유지보수 관점의 설명만 추가했다.

## 변경된 파일

- src/app/layout.tsx
- src/app/page.tsx
- src/app/(dashboard)/layout.tsx
- src/app/(dashboard)/transactions/page.tsx
- src/components/layout/RoutePrefetcher.tsx
- src/components/providers/ManualInputProvider.tsx
- src/components/providers/GlobalManualInputDialog.tsx
- src/server/services/parse-core.ts
- src/server/auth.ts
- middleware.ts
- src/server/actions/parse-unified.ts
- src/server/actions/transaction.ts
- src/components/transaction/UnifiedInputSection.tsx
- src/components/transaction/NaturalInputBar.tsx
- src/components/transaction/ParseResultSheet.tsx

## 결정 사항

- 프로젝트 전반 주석은 "상위 진입점 + 복잡한 분기"까지만 넣고, shadcn/ui 같은 저수준 프리미티브는 제외했다.
- 이미 설명이 충분한 자명한 코드에는 주석을 추가하지 않았다.
- JSX 라인별 설명이나 강의식 장문 주석은 피하고, 경계가 복잡한 분기만 설명했다.

## 다음 할 일

- 실제 유지보수 시 자주 여는 화면 기준으로 다른 도메인(`budget`, `assets`, `statistics`)에도 동일한 기준이 필요한지 점검한다.
