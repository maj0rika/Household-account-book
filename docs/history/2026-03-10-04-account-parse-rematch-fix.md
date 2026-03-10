---
date: 2026-03-10
type: fix
---

# 자산 부채 파싱 재매칭 누락 수정

## 변경 내용

- 자산/부채 파싱 결과 시트에서 사용자가 유형 또는 세부 유형을 바꿀 때 기존 계정 매칭을 다시 계산하도록 수정한다.
- 초기 파싱 시점뿐 아니라 편집 중에도 최신 필드 기준으로 `update` 대상 계정을 다시 찾도록 정리한다.
- 상세 유형 변경 시 다른 기존 계정으로 업데이트 타깃이 바뀌지 않던 저장 버그를 막는다.
- 재매칭 후에도 같은 계정을 갱신하는 경우 `type`까지 함께 저장되도록 배치 업데이트 경로를 보완한다.

## 변경된 파일

- docs/history/2026-03-10-04-account-parse-rematch-fix.md
- docs/implementation-plan.md
- src/components/assets/AccountParseResultSheet.tsx
- src/server/actions/account.ts

## 결정 사항

- 매칭 재계산은 클라이언트 편집 흐름에서 즉시 수행해 저장 직전의 `matchedAccount`와 `action`이 오래된 상태로 남지 않게 한다.
- 상세 유형 변경 시 새 매칭 후보를 찾을 수 있도록 매칭 우선순위에 `subType`을 포함한다.
- 사용자가 명시적으로 `신규`를 선택한 경우에는 재매칭 후보가 생겨도 그 선택을 유지하고, `업데이트` 상태일 때만 새 매칭 대상으로 따라가게 한다.

## 다음 할 일

- `.next/types/app/(dashboard)/settlements/page.ts` 누락 이슈를 정리한 뒤 전체 `npx tsc --noEmit`를 다시 확인한다.
- 자산/부채 파싱 결과 시트에서 유형/세부 유형 변경 후 저장 시나리오를 수동으로 회귀 점검한다.
