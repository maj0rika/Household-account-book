---
date: 2026-02-26
type: complete
pipeline: true
---

# DM-02 자산-거래 연동 모델 완료

## 요청 요약
거래 추가/수정/삭제 시 연결된 자산 계좌의 잔액이 자동으로 갱신되는 기능 구현

## 변경 내용
### 1. BE: 타입 및 Server Actions
- `Transaction` 인터페이스에 `accountId`, `account` 필드 추가
- `ParsedTransaction` LLM 타입에 `accountId` 필드 추가
- `getTransactions()` — accounts LEFT JOIN 추가, 거래 조회 시 계좌 정보 함께 반환
- `createSingleTransaction()` — accountId 저장 + DB 트랜잭션 내 계좌 잔액 반영
- `createTransactions()` (AI 배치) — accountId 저장 + 계좌 잔액 반영
- `updateTransaction()` — 이전 계좌 역산 + 새 계좌 반영 (원자적 트랜잭션)
- `deleteTransaction()` — 삭제 전 거래 조회 + 연결 계좌 잔액 역산
- 잔액 변동 헬퍼 `adjustAccountBalance()`, `reverseAccountBalance()` 추가

### 2. FE: 계좌 선택 UI
- `ManualInputDialog` — 계좌 Select 추가 (자산/부채 그룹 분리)
- `TransactionEditSheet` — 계좌 Select 추가
- `ParseResultSheet` — EditableItem에 계좌 Select 추가
- `TransactionItemContent` — 연결 계좌명 표시 (`카테고리 · 🏦계좌명`)

### 3. 데이터 흐름 연결
- 서버 페이지 → TransactionsLazySections → FilterableTransactionList → TransactionList → TransactionEditSheet 전체 체인에 accounts props 전달
- DayTransactionSheet에도 accounts optional prop 추가
- UnifiedInputSection → ParseResultSheet에 existingAccounts 전달

## 변경된 파일
| 파일 | 작업 | 설명 |
|------|------|------|
| `src/types/index.ts` | 수정 | Transaction에 accountId, account 추가 |
| `src/server/llm/types.ts` | 수정 | ParsedTransaction에 accountId 추가 |
| `src/server/actions/transaction.ts` | 수정 | 모든 CRUD에 계좌 연동 + 잔액 변동 로직 |
| `src/components/transaction/ManualInputDialog.tsx` | 수정 | 계좌 Select UI 추가 |
| `src/components/transaction/TransactionEditSheet.tsx` | 수정 | 계좌 Select UI 추가 |
| `src/components/transaction/ParseResultSheet.tsx` | 수정 | EditableItem에 계좌 Select 추가 |
| `src/components/transaction/TransactionItemContent.tsx` | 수정 | 연결 계좌 표시 |
| `src/components/transaction/TransactionList.tsx` | 수정 | accounts props 추가 |
| `src/components/transaction/FilterableTransactionList.tsx` | 수정 | accounts props 전달 |
| `src/components/transaction/UnifiedInputSection.tsx` | 수정 | ParseResultSheet에 accounts 전달 |
| `src/components/dashboard/TransactionsLazySections.tsx` | 수정 | accounts props 추가 |
| `src/components/dashboard/DayTransactionSheet.tsx` | 수정 | accounts optional prop 추가 |
| `src/app/(dashboard)/transactions/page.tsx` | 수정 | getAccounts 호출 + props 전달 |

## 설계 결정
### 잔액 변동 방식: 증분 업데이트 (Delta) vs 전체 재계산
- **선택**: 증분 업데이트 (`balance + delta`)
- **이유**: 성능 우수 (단일 UPDATE), 기존 수동 잔액과 호환, DB 트랜잭션으로 원자성 보장
- **대안 (미채택)**: 전체 재계산 (`SUM(transactions)`) — 정확하지만 매 거래마다 전체 합산 필요

### 계좌 선택 UI: 별도 얼럿 vs 폼 내장
- **선택**: 폼 내장 Select (하단에 배치)
- **이유**: 기존 UI 패턴과 일관성, 한 곳에서 모든 정보 입력, 선택사항이라 강제성 불필요
- **대안 (미채택)**: 별도 얼럿 (로드맵 초기안) — 추가 UI 플로우 복잡성

### DbTransaction 타입: any vs 정확한 추출
- **선택**: `Parameters<Parameters<typeof db.transaction>[0]>[0]` 으로 정확한 타입 추출
- **이유**: ESLint no-explicit-any 규칙 준수, 타입 안전성 확보

## 검증 결과
- TypeScript: ✅
- 빌드: ✅
- 테스트: N/A (테스트 없음)

## 다음 할 일
- DM-03: 거래 timestamp 초단위 저장 및 정렬 고도화
- DM-04: 고정거래 적용 내역 개별 항목 분리 표기
