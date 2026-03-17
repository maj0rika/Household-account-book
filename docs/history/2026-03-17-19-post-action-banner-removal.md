---
date: 2026-03-17
type: remove
---

# 저장 완료 배너 전체 제거

## 변경 내용

- 거래 저장 후 `/transactions?saved=tx`로 전달하던 성공 배너용 쿼리 파라미터를 제거했다;
- 거래 페이지에서 저장 완료 메시지를 계산하고 렌더링하던 상단 배너 영역을 제거했다;
- 더 이상 사용되지 않는 공용 `PostActionBanner` 컴포넌트를 삭제했다;

## 변경된 파일

- src/components/transaction/ParseResultSheet.tsx
- src/app/(dashboard)/transactions/page.tsx
- src/components/common/PostActionBanner.tsx
- docs/pipeline-state/2026-03-17-20-post-action-banner-removal.md

## 결정 사항

- 저장 후 라우트 이동만으로 사용자 맥락이 충분하다고 판단해 거래 저장 성공 배너도 자산 배너와 같은 기준으로 제거했다;
- 배너용 쿼리 파라미터와 공용 컴포넌트까지 함께 정리해 동일 패턴이 다시 남지 않도록 했다;
