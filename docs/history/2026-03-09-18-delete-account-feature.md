---
date: 2026-03-09
type: feature
---

# 계정 삭제 기능 추가

## 변경 내용

- Google Play 정책 준수를 위한 인앱 계정 삭제 기능 추가
- `deleteAccount` → `deleteUserAccount`로 리네이밍 (account.ts의 동명 함수와 충돌 방지)
- 비밀번호 확인 AlertDialog 컴포넌트 신규 생성
- ProfileSection에 Separator + 계정 삭제 버튼 추가

## 변경된 파일

- `src/server/actions/settings.ts` — `deleteUserAccount`로 리네이밍
- `src/components/settings/DeleteAccountDialog.tsx` — 신규 생성
- `src/components/settings/ProfileSection.tsx` — 삭제 버튼 + Dialog 연결

## 결정 사항

- Better Auth `deleteUser` 대신 직접 DB 삭제 — CASCADE 설정으로 모든 관련 데이터 자동 삭제
- AlertDialogAction 대신 직접 Button 사용 — disabled/로딩 상태 제어 필요
- `useTransition` + `useDeferredLoading(200)` 패턴 — CategoryManager와 동일한 패턴 유지
- 삭제 성공 시 `authClient.signOut()` 후 `/login` 리다이렉트
