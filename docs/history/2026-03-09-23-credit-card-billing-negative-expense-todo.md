---
date: 2026-03-09
type: feature
---

# 카드 부채/음수 지출 TODO 구체화

## 변경 내용

- `todos/` 디렉토리를 만들고, 카드 결제일 반영/청구기간/음수 지출 기능을 구현 가능한 수준의 파일 기반 TODO로 정리했다.
- `docs/roadmap-v2-todo-phase-plan.md`에 카드 부채 결제주기와 지출 차감 관련 백로그 항목을 추가했다.
- `docs/implementation-plan.md`에 후속 Phase 항목과 히스토리 로그를 추가했다.

## 변경된 파일

- docs/history/2026-03-09-23-credit-card-billing-negative-expense-todo.md
- todos/001-ready-p1-credit-card-billing-and-negative-expense.md
- docs/roadmap-v2-todo-phase-plan.md
- docs/implementation-plan.md

## 결정 사항

- 카드 사용 시점의 가계부 지출과 결제일의 실제 출금을 분리하는 방향을 기본 원칙으로 잡았다.
- 카드 계정은 기존 `debt` 범주를 유지하되, 청구기간과 결제일 규칙을 별도로 가져가야 한다고 명시했다.
- `지출 -금액` 입력은 수입이 아니라 지출 차감으로 처리하도록 범위를 고정했다.

## 다음 할 일

- 카드 부채 잔액 증감 방향과 결제일 반영 방식을 스키마/액션 수준으로 상세 설계한다.
- 음수 지출이 통계/예산/차트에 안전하게 반영되도록 집계 규칙과 예외 케이스를 검증한다.
