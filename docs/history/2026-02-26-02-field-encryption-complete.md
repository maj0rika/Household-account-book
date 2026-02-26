---
date: 2026-02-26
type: complete
pipeline: false
---

# DB 민감정보 필드 암호화 (AES-256-GCM) 구현 완료

## 요청 요약
가계부 앱의 민감 데이터(사용자 원본 입력, 메모)가 DB에 평문 저장되어 있어, 애플리케이션 레벨 필드 암호화(AES-256-GCM)를 적용하여 DB 유출 시 방어 레이어를 추가.

## 암호화 대상

### 암호화 적용 필드
| 테이블 | 필드 | 사유 |
|--------|------|------|
| `transactions` | `originalInput` | 사용자 원본 자연어 입력 (PII) |
| `transactions` | `memo` | 개인 메모 |

### 암호화 제외 필드 (핵심 기능 파괴 방지)
- `amount` — SUM, GROUP BY 집계 (통계/차트/예산)
- `description` — ilike 검색, 중복 감지
- `balance` — SUM 집계 (자산 총액)
- `categories.name` — UNIQUE 인덱스, LLM 프롬프트

## 변경 내용

### 1. 암호화 유틸리티 생성
- `src/server/lib/crypto.ts` 신규 생성
- Node.js 네이티브 `crypto` 모듈 사용 (외부 의존성 없음)
- AES-256-GCM (AEAD: 기밀성 + 무결성 동시 보장)
- 저장 포맷: `v1:{base64(iv[12] + authTag[16] + ciphertext)}`
- 함수: `encrypt()`, `decrypt()`, `encryptNullable()`, `decryptNullable()`, `isEncrypted()`
- `v1:` 프리픽스로 향후 키 로테이션 지원

### 2. 단위 테스트 (14개 전체 통과)
- `src/server/lib/__tests__/crypto.test.ts` 신규 생성
- 라운드트립, IV 고유성, null/빈문자열, 변조 감지, 키 미설정 에러, 잘못된 키 길이

### 3. transaction.ts 암호화 적용
- `createTransactions()`: `originalInput` → `encryptNullable()`, 고정거래 자동생성 memo도 암호화
- `getTransactions()`: 조회 결과에서 `originalInput`, `memo` → `decryptNullable()`
- `updateTransaction()`: `memo` 업데이트 시 `encryptNullable()`
- `createSingleTransaction()`: `memo` → `encryptNullable()`

### 4. recurring.ts 중복감지 전환 + 암호화 적용
- 핵심 변경: `eq(transactions.memo, "고정 거래 자동 생성")` → `eq(transactions.isRecurring, true)`
- memo가 암호화되면 평문 비교 불가하므로 기존 `isRecurring` boolean 필드 활용
- `applyRecurringTransactions()`, `checkRecurringApplied()`, `autoApplyRecurringTransactions()` 3곳 수정

### 5. 마이그레이션 스크립트 + seed.ts
- `scripts/encrypt-existing-data.ts`: 기존 데이터 암호화 (멱등성 보장 — `isEncrypted()` 체크)
- `seed.ts`: 시드 데이터 memo 암호화 적용
- `package.json`: `db:encrypt-existing` 스크립트 추가

### 6. 환경변수
- `.env.example`에 `ENCRYPTION_KEY` 추가 (32바이트 = 64자 hex)

## 변경된 파일
| 파일 | 작업 | 설명 |
|------|------|------|
| `src/server/lib/crypto.ts` | 신규 | AES-256-GCM 암호화 유틸리티 (~70행) |
| `src/server/lib/__tests__/crypto.test.ts` | 신규 | 단위 테스트 14개 (~80행) |
| `scripts/encrypt-existing-data.ts` | 신규 | 기존 데이터 마이그레이션 (~55행) |
| `src/server/actions/transaction.ts` | 수정 | 암호화/복호화 5곳 적용 |
| `src/server/actions/recurring.ts` | 수정 | 중복감지 isRecurring 전환 + memo 암호화 |
| `src/server/db/seed.ts` | 수정 | 시드 데이터 memo 암호화 |
| `.env.example` | 수정 | ENCRYPTION_KEY 추가 |
| `package.json` | 수정 | db:encrypt-existing 스크립트 추가 |

## 설계 결정

### AES-256-GCM 선택
- **이유**: AEAD 모드로 기밀성 + 무결성 동시 보장, Node.js 네이티브 지원
- **대안 (미채택)**: AES-CBC + HMAC (별도 무결성 검증 필요), ChaCha20-Poly1305 (Node.js 지원 불안정)

### 중복감지를 isRecurring 필드로 전환
- **이유**: memo 암호화 시 평문 비교 불가, 이미 스키마에 `isRecurring` boolean 존재
- **장점**: 의미적으로 더 명확하고, 인덱스 활용 가능

### 스키마 무변경 전략
- **이유**: `text` 컬럼 그대로 사용 — 암호문이 base64 문자열이므로 호환
- **장점**: 마이그레이션 불필요, 롤백 용이

## 검증 결과
- TypeScript: ✅ `npx tsc --noEmit` 통과
- 테스트: ✅ 16개 전체 통과 (crypto 14개 + utils 2개)
- 마이그레이션: ✅ 76건 암호화 완료, 재실행 시 76건 스킵 (멱등성 확인)
- DB 확인: ✅ `originalInput`이 `v1:...` 형태로 저장, 복호화 시 원본 복원 정상

## 다음 할 일
- Vercel 환경변수에 `ENCRYPTION_KEY` 설정
- 프로덕션 배포 후 기존 데이터 마이그레이션 실행 (`npm run db:encrypt-existing`)
- 에러 모니터링(Sentry) 연동 시 복호화 실패 알림 추가 검토
