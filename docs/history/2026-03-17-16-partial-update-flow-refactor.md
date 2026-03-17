---
date: 2026-03-17
type: refactor
---

# 저장/수정 후 부분 갱신 흐름 단순화

## 변경 내용

- `AccountParseResultSheet`, `ParseResultSheet`의 초안 항목 키 생성을 증가 시퀀스 대신 `crypto.randomUUID()`로 바꿨다;
- 자산/거래 수정 시트에서 낙관적 업데이트 객체를 더 명확하게 만들고, 저장 성공 직후 상위 리스트가 즉시 반영되도록 콜백 경계를 정리했다;
- 파싱 결과 시트의 핸들러와 파생 배열 계산을 `useCallback`, `useMemo`로 고정해 저장/삭제 후 부분 갱신 흐름을 단순화했다;

## 변경된 파일

- `src/components/assets/AccountFormSheet.tsx`
- `src/components/assets/AccountParseResultSheet.tsx`
- `src/components/transaction/ParseResultSheet.tsx`
- `src/components/transaction/TransactionEditSheet.tsx`

## 결정 사항

- 렌더 사이클과 무관한 draft key는 전역 증가값보다 브라우저 고유 ID를 쓰는 편이 재마운트와 Strict Mode에 안전하다;
- 시트 컴포넌트는 서버 저장과 낙관적 반영 경계만 담당하고, 실제 리스트 동기화 책임은 상위 목록 컴포넌트 콜백으로 유지했다;
- 파생 데이터와 이벤트 핸들러를 메모이즈해 부분 갱신 중 불필요한 재연산과 재생성을 줄였다;
