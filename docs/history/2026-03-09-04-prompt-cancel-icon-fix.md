---
date: 2026-03-09
type: fix
---

# 프롬프트 취소 버튼 아이콘 수정

## 변경 내용

- `src/components/transaction/NaturalInputBar.tsx`의 로딩 상태 취소 버튼 아이콘을 `Square`에서 `X`로 교체했다.
- 취소 아이콘 크기를 키워 모바일 하단 입력바에서도 식별이 잘 되도록 조정했다.

## 변경된 파일

- src/components/transaction/NaturalInputBar.tsx
- docs/history/2026-03-09-04-prompt-cancel-icon-fix.md
- docs/implementation-plan.md

## 결정 사항

- 요청 취소 액션은 정지용 사각형보다 닫기/취소 의미가 명확한 `X` 아이콘이 더 적합하다.
- 작은 아이콘에서는 `Square` 외곽선이 체크박스처럼 보여 오해를 만들 수 있으므로 가독성을 우선했다.
