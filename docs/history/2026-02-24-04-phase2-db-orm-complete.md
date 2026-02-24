---
date: 2026-02-24
phase: 2
type: complete
---

# Phase 2 DB + ORM 완료

## 변경 내용
- Supabase PostgreSQL 연동 완료 (`DATABASE_URL` 설정)
- 마이그레이션 2건 실행 성공 (0000: 기본 스키마, 0001: Better Auth 테이블)
- 시드 데이터 주입 완료 (데모 유저 + 기본 카테고리 16개)

## 최종 DB 상태

### 테이블 목록
| 테이블 | 용도 |
|--------|------|
| `users` | 앱 사용자 (가계부 데이터 소유) |
| `categories` | 수입/지출 카테고리 |
| `transactions` | 거래 내역 |
| `budgets` | 월별 예산 |
| `user` | Better Auth 인증 사용자 |
| `session` | Better Auth 세션 |
| `account` | Better Auth 소셜 계정 |
| `verification` | Better Auth 이메일 인증 |

### 시드 데이터
- 데모 유저: seed@household.local
- 기본 카테고리: 지출 12개 + 수입 4개

## 결정 사항
- Supabase Pooler 연결 사용 (포트 6543, Transaction Mode)
- Better Auth 테이블은 별도 prefix 없이 `user`, `session`, `account`, `verification` 사용
- 앱 `users` 테이블과 Better Auth `user` 테이블은 별도 관리 (추후 연동 시 동기화 로직 추가)

## 다음 할 일
- Phase 3: Better Auth 인증 구현 (로그인/회원가입 페이지 + 미들웨어)
