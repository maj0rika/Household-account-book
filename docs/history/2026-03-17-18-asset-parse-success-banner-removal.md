---
date: 2026-03-17
type: remove
---

# 자산 파싱 저장 후 성공 배너 제거

## 변경 내용

- 자산/부채 파싱 결과 저장 후 `/assets`와 혼합 입력의 `/transactions`로 이동할 때 붙이던 성공 배너용 쿼리 파라미터를 제거했다;
- 자산 페이지에서 자산 파싱 저장 성공 배너 렌더링 자체를 제거했다;
- 거래 페이지는 자산 혼합 저장 배너 분기를 제거하고 기존 거래 저장 배너(`saved=tx`)만 유지했다;

## 변경된 파일

- src/components/assets/AccountParseResultSheet.tsx
- src/app/(dashboard)/assets/page.tsx
- src/app/(dashboard)/transactions/page.tsx
- docs/pipeline-state/2026-03-17-18-asset-parse-success-banner-removal.md

## 결정 사항

- 자산 파싱 승인 직후에는 라우트 이동만으로 맥락이 충분하다고 판단해 중복 성공 피드백을 제거했다;
- 거래 저장 완료 배너는 별도 플로우이므로 유지해 기존 거래 저장 피드백은 바꾸지 않았다;
