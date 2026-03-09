---
date: 2026-03-09
type: feature
pipeline: true
---

# 파싱 엔트리포인트 통합 + 계정 데이터 암호화

## 변경 내용

### Phase 1: 계정 데이터 암호화 (name + balance)

- `crypto.ts`에 숫자/문자열 전용 하위호환 헬퍼 추가
  - `encryptNumber`/`decryptNumber(string | number)` — 마이그레이션 전 integer 직접 반환도 처리
  - `decryptString` — 마이그레이션 전 평문 문자열은 그대로 반환
- `schema.ts`의 `accounts.balance` 타입을 `integer` → `text`로 변경 (암호화 저장)
- DB 마이그레이션 SQL(`0007_encrypt-account-fields.sql`) 및 journal 엔트리 추가
- `account.ts` CRUD 전체에 암호화/복호화 적용
  - `getAccounts()`: `decryptString(name)`, `decryptNumber(balance)` 복호화
  - `getAccountSummary()`: DB SUM 불가 → 애플리케이션 레벨 합산으로 변경
  - `createAccount()`, `updateAccount()`, `upsertParsedAccountsBatch()`: 암호화 저장
- `transaction.ts` 잔액 조정 패턴 변경
  - `adjustAccountBalance`/`reverseAccountBalance`: DB 산술 → 조회(FOR UPDATE) → 복호화 → 계산 → 암호화 → 저장
  - `getTransactions`: JOIN 결과의 `accountName` → `decryptString()` 복호화 추가
- 기존 데이터 마이그레이션 스크립트(`scripts/migrate-encrypt-accounts.ts`) 작성

### Phase 2: 파싱 엔트리포인트 통합

- `src/server/services/parse-core.ts` 신규 생성
  - 세션 추출을 제외한 코어 파싱 로직 추출 (Fireworks 카운터, provider/timeout 결정, DB 조회, OOD 필터)
  - `executeTextParse(input, userId, sessionId)` — 코어 텍스트 파싱
  - `executeImageParse(imageBase64, mimeType, textInput, userId, sessionId)` — 코어 이미지 파싱
- `parse-unified.ts`를 얇은 래퍼로 리팩토링 (세션 추출 → `parse-core` 호출)
- `/api/parse/route.ts` 완전 재작성
  - `application/json` → `executeTextParse()` 호출
  - `multipart/form-data` → `executeImageParse()` 호출
  - 에러 코드: 401(인증), 400(잘못된 요청), 422(파싱 실패)
- 레거시 삭제
  - `src/server/actions/parse.ts` 삭제 (미사용)
  - `src/server/llm/index.ts`의 `parseTransactionText`, `parseTransactionImage` 래퍼 함수 삭제

## 변경된 파일

- `src/server/lib/crypto.ts` — encryptNumber/decryptNumber 추가
- `src/server/db/schema.ts` — balance integer→text
- `src/server/db/migrations/0007_encrypt-account-fields.sql` — 신규
- `src/server/db/migrations/meta/_journal.json` — idx 7 추가
- `src/server/actions/account.ts` — 전체 CRUD 암호화/복호화
- `src/server/actions/transaction.ts` — 잔액 조정 패턴 변경 + accountName 복호화
- `src/server/actions/parse-unified.ts` — 얇은 래퍼로 리팩토링
- `src/server/services/parse-core.ts` — 신규 (코어 파싱 로직)
- `src/app/api/parse/route.ts` — 통합 업그레이드
- `src/server/llm/index.ts` — 레거시 래퍼 삭제
- `src/server/actions/parse.ts` — 삭제
- `scripts/migrate-encrypt-accounts.ts` — 신규 (데이터 마이그레이션)

## 결정 사항

- **balance를 text로 변경한 이유**: AES-256-GCM 암호화 결과는 바이너리(base64 문자열)이므로 integer 컬럼에 저장할 수 없음
- **DB SUM → 애플리케이션 합산**: 암호화된 데이터는 SQL 집계 함수로 연산 불가, 전체 행을 조회 후 복호화하여 합산
- **FOR UPDATE 사용**: 동시성 환경에서 잔액 정합성을 보장하기 위해 비관적 잠금 적용
- **parse-core.ts 분리**: Server Action(세션 기반)과 API 라우트(request 헤더 기반)의 인증 메커니즘이 다르므로, 인증 이후 로직을 공유 서비스로 추출
- **레거시 삭제**: `parse.ts`는 어디에서도 import되지 않아 안전하게 삭제, `parseTransactionText`/`parseTransactionImage`는 더 이상 사용처 없음

## 검증 결과

- TypeScript: ✅
- ESLint: ✅
- 빌드: ✅
- 런타임 동작: ✅ (마이그레이션 전 평문 데이터도 정상 작동 확인)

## 다음 할 일

- 배포 후 `scripts/migrate-encrypt-accounts.ts` 실행하여 기존 평문 데이터 암호화
- DB 마이그레이션(`0007_encrypt-account-fields.sql`) 적용
