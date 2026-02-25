-- ============================================================
-- RLS (Row Level Security) 활성화 — 모든 public 테이블
-- ============================================================
-- 목적: PostgREST API(뒷문)를 통한 무인가 데이터 접근 차단
-- 영향: 앱은 service_role(관리자)로 접속하므로 RLS 우회 → 영향 없음
--       anon/authenticated role의 PostgREST 직접 접근만 차단됨
-- ============================================================

-- ── 1. Better Auth 테이블 (민감도: 치명적) ──

-- user 테이블: 이메일, 이름 등 개인정보
ALTER TABLE "public"."user" ENABLE ROW LEVEL SECURITY;

-- account 테이블: 비밀번호 해시, access_token, refresh_token
ALTER TABLE "public"."account" ENABLE ROW LEVEL SECURITY;

-- session 테이블: 세션 토큰 (유출 시 세션 하이재킹)
ALTER TABLE "public"."session" ENABLE ROW LEVEL SECURITY;

-- verification 테이블: 이메일 검증 OTP 코드
ALTER TABLE "public"."verification" ENABLE ROW LEVEL SECURITY;

-- ── 2. 앱 데이터 테이블 (민감도: 높음) ──

-- transactions: 거래 내역 (금액, 설명, 날짜)
ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;

-- budgets: 예산 정보
ALTER TABLE "public"."budgets" ENABLE ROW LEVEL SECURITY;

-- categories: 카테고리 설정
ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;

-- recurring_transactions: 고정 거래
ALTER TABLE "public"."recurring_transactions" ENABLE ROW LEVEL SECURITY;

-- accounts: 자산/부채 계정 (잔액 포함)
ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS 활성화만 하고 정책(Policy)은 추가하지 않음
-- → anon/authenticated role은 아무 행도 읽기/쓰기 불가
-- → service_role은 RLS를 자동 우회하므로 앱 정상 동작
-- ============================================================
