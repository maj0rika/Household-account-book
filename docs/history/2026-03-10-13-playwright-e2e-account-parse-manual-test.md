---
date: 2026-03-10
phase: 13
type: fix
---

# Playwright E2E 도입 + 자산 파싱 기존 계정 동기화 보강

## 변경 내용

- `@playwright/test` 기반 E2E 실행 환경을 프로젝트에 고정하고 `test:e2e`, `test:e2e:headed`, `test:e2e:install` 스크립트를 추가했습니다.
- `playwright.config.ts`를 추가해 `localhost:3002` 기준으로 Better Auth 개발 서버를 함께 띄우고, 실패 시 trace/screenshot/video를 남기도록 설정했습니다.
- 새 사용자가 `/assets`에서 계정을 방금 만든 직후에도 전역 자연어 입력 시트가 최신 계정 목록을 사용하도록 `UnifiedInputSection`의 `initialAccounts`/`initialCategories` 동기화를 추가했습니다.
- 자산 추가/파싱 편집 UI에 라벨과 `aria-label`을 보강해 수동 테스트와 Playwright locator가 접근성 기반으로 동작하도록 정리했습니다.
- `e2e/account-parse-rematch.spec.ts`에서 다음 시나리오를 자동 검증하도록 추가했습니다.
	- 방금 만든 `카카오뱅크`, `토스뱅크`가 파싱 시트에서 즉시 `업데이트`로 매칭되는지
	- 이름 변경 시 `신규`로 바뀌는지
	- 원래 값으로 복원하면 다시 `업데이트`로 돌아오는지
	- 첫 항목 삭제 후 남은 항목도 동일하게 `신규 → 업데이트`로 복구되는지

## 변경된 파일

- .gitignore
- package.json
- playwright.config.ts
- e2e/account-parse-rematch.spec.ts
- src/components/transaction/UnifiedInputSection.tsx
- src/components/assets/AccountFormSheet.tsx
- src/components/assets/AccountParseResultSheet.tsx

## 결정 사항

- 전역 입력 UI는 대시보드 레이아웃에 붙어 있어 서버 액션 후 최신 props가 내려와도 내부 `useState`가 자동 동기화되지 않았습니다. 따라서 계정 생성 직후 파싱 매칭이 어긋나는 회귀를 막기 위해 props 변경을 상태에 반영하는 동기화 effect를 추가했습니다.
- 재현성이 필요한 QA 요청이 반복되고 있어 ad-hoc 스크립트 대신 Playwright 설정과 spec 파일을 repo에 남겨 이후에도 같은 시나리오를 한 명령으로 검증할 수 있게 했습니다.

## 다음 할 일

- 자산/부채 파싱 외에도 거래 파싱 시트, 인증 만료 복구 시나리오를 Playwright E2E로 확장합니다.
