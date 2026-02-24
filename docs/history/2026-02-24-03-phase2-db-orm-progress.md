---
date: 2026-02-24
phase: 2
type: progress
---

# Phase 2 DB + ORM 진행

## 변경 내용
- Drizzle ORM 설정 파일 `drizzle.config.ts` 추가
- DB 스키마(`users`, `categories`, `transactions`, `budgets`) 구현
- Drizzle 마이그레이션 생성 스크립트/실행 스크립트/시드 스크립트 추가
- 기본 카테고리 시드 데이터 및 시드 실행 코드 추가
- 초기 SQL 마이그레이션 파일 생성 완료

## 변경된 파일
- `drizzle.config.ts`
- `src/server/db/index.ts`
- `src/server/db/schema.ts`
- `src/server/db/seed.ts`
- `src/lib/constants.ts`
- `src/server/db/migrations/0000_productive_ender_wiggin.sql`
- `src/server/db/migrations/meta/0000_snapshot.json`
- `src/server/db/migrations/meta/_journal.json`
- `package.json`

## 결정 사항
- Supabase 연결 전에도 스키마/마이그레이션 생성이 가능하도록 로컬 기본 URL fallback 구성
- `db:migrate` 실행은 실제 DB(`DATABASE_URL`) 연결이 있어야 하므로 연결 실패 시 즉시 에러를 노출하도록 유지

## 다음 할 일
- Supabase 프로젝트 생성 후 `DATABASE_URL` 설정
- `npm run db:migrate` 재실행으로 실제 DB 반영
- `npm run db:seed`로 기본 카테고리 데이터 주입
