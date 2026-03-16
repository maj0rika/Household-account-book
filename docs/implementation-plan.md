# 구현 계획서 (Implementation Plan)

> **프로젝트**: AI 자동 분류 가계부 앱
> **시작일**: 2026-02-24
> **설계 문서**: [brainstorm](./brainstorms/2026-02-24-household-account-book-brainstorm.md)

---

## 구현 순서

전체 구현을 **Phase** 단위로 나누고, 각 Phase 완료 시 히스토리를 기록한다.

### Phase 1: 프로젝트 초기화 ✅

- [x] Next.js 15 + TypeScript 프로젝트 생성
- [x] Tailwind CSS 4 설정
- [x] shadcn/ui 초기화
- [x] ESLint + Prettier 설정
- [x] 디렉토리 구조 생성
- [x] Git 초기화 + .gitignore
- [x] 환경변수 템플릿 (.env.example)

### Phase 2: DB + ORM 셋업 ✅

- [x] Supabase 프로젝트 생성
- [x] Drizzle ORM 설정 (drizzle.config.ts)
- [x] DB 스키마 정의 (users, categories, transactions, budgets)
- [x] 마이그레이션 생성 및 실행
- [x] 시드 데이터 (기본 카테고리)

### Phase 3: 인증 ✅

- [x] Better Auth 설정 (Drizzle 스키마 매핑 포함)
- [x] 이메일/비밀번호 가입 + 로그인
- [x] ~~Google 소셜 로그인~~ (커스텀 도메인 미사용으로 제거)
- [x] 인증 미들웨어 (보호된 라우트)
- [x] 로그인/회원가입 페이지 UI

### Phase 4: LLM 파서 (핵심 기능) ✅

- [x] 파싱 결과 타입 정의 (ParsedTransaction, ParseResponse)
- [x] 프롬프트 템플릿 작성 (카테고리 동적 삽입, 한국어 금액/상대 날짜 규칙)
- [x] LLM 클라이언트 팩토리 (OpenAI SDK 기반, baseURL로 Kimi/Fireworks/MiniMax 전환)
- [x] 통합 파싱 함수 (LLM 호출 → JSON 추출 → 유효성 검증 + provider 정책 정리)
- [x] 파싱 API Route (/api/parse) + `parse-core` 공용 서비스
- [x] 에러 핸들링 (자동 재시도 제거, 실패 시 에러 메시지 반환)
- [x] 카테고리 미매칭 시 새 카테고리 추가 권유 플로우 (LLM이 기존 카테고리에 해당 없다고 판단하면 → 파싱 결과에 suggestedCategory 포함 → UI에서 "새 카테고리 추가" 안내)

### Phase 5: 핵심 UI (모바일 퍼스트) ✅

- [x] DB 스키마 마이그레이션 (users 제거, authUsers로 FK 통합)
- [x] shadcn/ui 컴포넌트 설치 (button, input, card, dialog, drawer 등 11개)
- [x] 거래 CRUD Server Actions (생성, 조회, 삭제, 월별 요약)
- [x] 레이아웃: 하단 탭바 (모바일) / 사이드바 (데스크톱)
- [x] 자연어 입력바 (하단 고정, AI 파싱 호출)
- [x] AI 파싱 결과 Bottom Sheet (확인/삭제/저장)
- [x] 거래 목록 (날짜별 그룹, 삭제 버튼)
- [x] 수동 입력 폼 (Dialog)
- [x] 인증 기반 리디렉트 (/ → /transactions 또는 /login)
- [x] 회원가입 시 기본 카테고리 자동 생성 (databaseHooks)

### Phase 6: 대시보드 + 통계 ✅

- [x] 월 선택 네비게이션 (이전/다음 월, URL searchParams)
- [x] 카테고리별 지출 도넛 차트 (Recharts)
- [x] 주간 미니 바 차트 (최근 7일 일별 지출)
- [x] 달력 뷰 (일별 수입/지출 금액 표시)
- [x] 고정 수입/지출 (recurring_transactions 테이블, CRUD, 월 일괄 적용)
- [x] Server Actions: getCategoryBreakdown, getDailyExpenses, getMonthlyCalendarData

---

### Phase 7: 메시지/은행 내역 연동 ✅

카카오톡/SMS 은행 알림 메시지를 붙여넣으면 AI가 자동 파싱하는 기능.

- [x] LLM 프롬프트 확장 (은행/카드 알림 메시지 파싱 규칙)
- [x] NaturalInputBar 멀티라인 모드 (붙여넣기 감지)
- [x] 주요 은행/카드사 포맷 지원 (카카오뱅크, 신한, 국민, 토스 등)
- [x] 여러 줄 메시지 배치 파싱 → 다건 거래 생성

### Phase 8: 통계 페이지 ✅

- [x] `/statistics` 페이지 생성
- [x] 월별 수입/지출 추이 바 차트 (최근 6개월)
- [x] 카테고리별 지출 랭킹 (건수, 비율 포함)
- [x] 월 네비게이션 + 월별 요약 카드

### Phase 9: 예산 페이지 ✅

- [x] `/budget` 페이지 생성
- [x] 예산 CRUD (전체 + 카테고리별, upsert)
- [x] 예산 대비 지출 진행률 바 (초과 시 빨간색)
- [x] 월 네비게이션
- [x] 예산 수정 기능 (기존 예산 금액 변경/삭제)

### Phase 10: 설정 페이지 ✅

- [x] `/settings` 페이지 생성
- [x] 프로필 표시 (이름, 이메일)
- [x] 로그아웃
- [x] 카테고리 관리 (목록/추가/삭제)
- [x] 다크모드 토글

### Phase 11: UX 고도화 (프롬프트/파싱/네비게이션) ✅

- [x] 고정거래 프롬프트 입력 (LLM 인식 → recurring_transactions 자동 등록)
- [x] 파싱 결과 편집 (날짜/금액/카테고리/설명/타입/고정여부 수정 가능)
- [x] 거래 목록 고정거래 뱃지 표시 (isRecurring 필드 + 🔄 아이콘)
- [x] Sidebar 접힘/펼침 토글 (아이콘만 ↔ 아이콘+텍스트, localStorage 유지)
- [x] 프롬프트 플레이스홀더 랜덤 (12가지 예시 문구)
- [x] 이미지 파싱 (OpenAI 호환 SDK 기반, base64 전송, 영수증/카드내역 인식)

### Phase 12: 디자인 폴리싱 ✅

- [x] Glassmorphism 탭바/네비게이션
- [x] Framer Motion 애니메이션 (리스트 추가, Bottom Sheet, 차트 업데이트)
- [x] Mesh Gradient 대시보드 카드
- [x] Pretendard + Geist 폰트 적용
- [x] 마이크로 인터랙션 (active:scale, 탭 인디케이터, 호버 효과)
- [x] 스켈레톤 로딩 (페이지별 loading.tsx)

### Phase 12A: Capacitor (네이티브 앱) ✅

- [x] Capacitor 설치 + 설정
- [x] iOS/Android 플랫폼 추가
- [x] Vercel 배포 URL을 WebView로 로드하는 방식 (SSR이라 static export 불가)
- [x] safe-area 적용 (viewport-fit: cover + env(safe-area-inset-\*))
- [x] Android 릴리스 AAB 빌드 완료
- [ ] Share Extension (메시지 공유 → 자동 파싱) — 추후

### Phase 13: 배포 ✅

- [x] Vercel 연동 (웹 배포)
- [x] 환경변수 설정 (Vercel Dashboard)
- [x] Google OAuth 제거 (커스텀 도메인 불필요)
- [ ] 앱스토어 제출 (iOS + Android) — 진행 중

---

## v1.1 확장 기능

### Phase 14: N분의 1 정산 (더치페이) 🆕

내가 먼저 전체를 결제하더라도, **가계부 본체는 내 부담금만 기록**하고, 총액/참여자/미수금은 별도 정산 레이어에서 추적한다.

핵심 불변조건: **총무 역할을 했더라도 내 가계부는 총액 기준으로 오염되면 안 된다.**

- [ ] PM 원칙 확정: `transactions.amount`는 `내 부담금` 기준으로 유지하고, 총액은 정산 메타데이터로 분리
- [ ] DB 스키마: `settlements`, `settlement_members` 테이블 추가
- [ ] 거래 저장 시 정산 데이터 동시 생성 (총액, 내 몫, 인원, 총무 여부, 멤버 상태)
- [ ] 파싱 결과 시트에서 `총액`, `내 몫`, `인원`, `참여자`, `완료 상태` 수정 가능
- [ ] 자연어 입력: `3명이서 9만원, 내가 냈고 내 몫은 3만원` 같은 문장을 정산 포함 거래로 파싱
- [ ] 이미지 입력: 카카오톡/토스 등 정산 스크린샷 업로드 시 초안 자동 파싱
- [ ] 정산 현황 대시보드 (받아야 할 금액, 완료/미완료, 참여자별 상태)
- [ ] 개별 정산 완료 체크 및 미수금 갱신
- [ ] 계좌 기능 사용 시 `가계부 금액`과 `실제 계좌 영향 금액` 분리 설계 검토
- [ ] 후속: 정산 완료 메시지/입금 알림 자동 파싱

참고 문서: 정산 설계 문서는 현재 저장소에 정식 기록이 없어 추후 별도 추가 예정

### Phase 15: 예산 알림

- [ ] 카테고리별/전체 월 예산 설정
- [ ] 예산 초과 시 알림 (웹 + 푸시)
- [ ] 예산 대비 지출 진행률 바

### Phase 16: 거래 검색/필터 ✅

- [x] 키워드/카테고리/유형 검색 (클라이언트 사이드 필터링)
- [x] 카테고리 다중 선택
- [x] 필터 조합 (AND)
- [x] 검색 결과 내 통계 (건수, 합계)

### Phase 17: AI 학습 개선 + 음성 입력

- [ ] 사용자 수정 피드백 반영 (파싱 정확도 향상)
- [ ] 음성 입력 (Web Speech API / Capacitor 마이크)
- [ ] 영수증 사진 OCR → 파싱

### Phase 18A: 자산/부채 관리 ✅

- [x] DB 스키마: accounts 테이블 (자산/부채 통합)
- [x] transactions.accountId FK 추가 (nullable, 하위 호환)
- [x] 계정 CRUD Server Actions
- [x] `/assets` 페이지 (순자산 요약 카드 + 자산/부채 목록)
- [x] 계정 추가/수정 Drawer (이름, 유형, 세부유형, 아이콘, 잔액)
- [x] 네비게이션에 자산 탭 추가

### Phase 18B: 자산/부채 API 연동

- [ ] bankapi.co.kr 연동 (5대 은행 잔액 자동 조회)
- [ ] Codef API 검토 (더 많은 은행 지원)
- [ ] 잔액 자동 동기화
- [ ] 거래 입력 시 계정 선택 → 자동 잔액 갱신

---

## 히스토리 관리 규칙

모든 구현 진행 상황은 `docs/history/` 폴더에 날짜별로 기록한다.

**파일 네이밍**: `YYYY-MM-DD-NN-<주제>.md` (같은 날 여러 건이면 NN으로 순번)

**기록 시점**:

1. Phase 시작 시
2. Phase 완료 시
3. 설계 변경 시
4. 주요 이슈 발생/해결 시

**히스토리 템플릿**:

```markdown
---
date: YYYY-MM-DD
phase: N (선택)
type: feature | fix | refactor | perf | config | remove | docs
---

# [제목]

## 변경 내용

- 무엇을 했는지

## 변경된 파일

- path/to/file.ts

## 결정 사항

- 왜 이렇게 했는지

## 다음 할 일

- 다음 작업
```

**히스토리 인덱스**: 이 파일(`implementation-plan.md`)의 하단에 히스토리 링크를 누적한다.

**레거시 허용 범위**:

- 기존 히스토리의 `start | progress | complete | change | issue`는 보존한다.
- 기존 날짜-순번 중복은 rename 없이 유지하고, 신규 히스토리부터만 중복을 금지한다.
- 신규 히스토리는 canonical `type`만 사용한다.

---

## 히스토리 로그

| 날짜       | 구분        | 제목                                                                               | 링크                                                                                  |
| ---------- | ----------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 2025-03-09 | 기능        | Deep-Dive 면접 대응 매뉴얼 작성                                                    | [history](./history/2025-03-09-01-interview-deep-dive-manual.md)                      |
| 2025-03-09 | 기능        | 제품 이해 면접 대응 매뉴얼 작성                                                    | [history](./history/2025-03-09-02-interview-product-manual.md)                        |
| 2026-02-24 | 설계        | 프로젝트 설계 완료 (브레인스토밍)                                                  | [brainstorm](./brainstorms/2026-02-24-household-account-book-brainstorm.md)           |
| 2026-02-24 | 계획        | 구현 계획서 작성                                                                   | 이 문서                                                                               |
| 2026-02-24 | 레거시 완료 | 프로젝트 설계 완료                                                                 | [history](./history/2026-02-24-01-project-design-complete.md)                         |
| 2026-02-24 | 완료        | Phase 1 프로젝트 초기화 완료                                                       | [history](./history/2026-02-24-02-phase1-initialization-complete.md)                  |
| 2026-02-24 | 진행        | Phase 2 DB + ORM 진행                                                              | [history](./history/2026-02-24-03-phase2-db-orm-progress.md)                          |
| 2026-02-24 | 진행        | Phase 3 인증 진행                                                                  | [history](./history/2026-02-24-04-phase3-auth-progress.md)                            |
| 2026-02-24 | 완료        | Phase 2 DB + ORM 완료 (Supabase 연동)                                              | [history](./history/2026-02-24-04-phase2-db-orm-complete.md)                          |
| 2026-02-24 | 완료        | Phase 3 인증 완료                                                                  | [history](./history/2026-02-24-05-phase3-auth-complete.md)                            |
| 2026-02-25 | 완료        | Phase 4 LLM 파서 구현 완료                                                         | [history](./history/2026-02-25-01-phase4-llm-parser-complete.md)                      |
| 2026-02-25 | 완료        | Phase 5 핵심 UI 구현 완료                                                          | —                                                                                     |
| 2026-02-25 | 완료        | Phase 6 대시보드 + 통계 구현 완료                                                  | —                                                                                     |
| 2026-02-25 | 완료        | Phase 7 메시지/은행 내역 연동 완료                                                 | [history](./history/2026-02-25-02-phase7-bank-message-complete.md)                    |
| 2026-02-25 | 완료        | Phase 8~10 통계/예산/설정 페이지 구현 (LNB 전체 접근 가능)                         | —                                                                                     |
| 2026-02-25 | 완료        | 디자인 시스템 수립 + 시드 스크립트 개선 + 인증 접근 제어                           | —                                                                                     |
| 2026-02-25 | 완료        | Phase 11 UX 고도화 (고정거래 프롬프트, 파싱편집, Sidebar토글, 이미지파싱)          | —                                                                                     |
| 2026-02-25 | 완료        | Phase 12 디자인 폴리싱 (Motion, Mesh Gradient, Pretendard, Skeleton)               | —                                                                                     |
| 2026-02-25 | 계획        | v2 TODO + 페이즈 계획 수립                                                         | [roadmap-v2](./roadmap-v2-todo-phase-plan.md)                                         |
| 2026-02-25 | 결정        | v2 요구사항 의사결정 반영 (월점프/차트필터/리다이렉트/암호화 범위)                 | [roadmap-v2](./roadmap-v2-todo-phase-plan.md)                                         |
| 2026-02-25 | 결정        | 추가 확정: 자산 선택 1회 기본+설정 변경, 중복판정 2A, Kimi 임계치 100자, soft 제한 | [roadmap-v2](./roadmap-v2-todo-phase-plan.md)                                         |
| 2026-02-25 | 진행        | v2 Phase 1 1차 구현 (월점프/주간필터/아코디언/금액포맷/차트상세)                   | [roadmap-v2](./roadmap-v2-todo-phase-plan.md)                                         |
| 2026-02-25 | TODO        | 리스크 후속 항목 추가 (월 전환 vs 주간 필터 정합성)                                | [roadmap-v2](./roadmap-v2-todo-phase-plan.md)                                         |
| 2026-02-25 | 완료        | 리스크 보완: 월 전환과 주간 필터 범위 정합성 개선(TX-09)                           | [roadmap-v2](./roadmap-v2-todo-phase-plan.md)                                         |
| 2026-02-25 | 진행        | v2 Phase 2 1차 구현 (prefetch/dynamic import/skeleton/top-down loading)            | [roadmap-v2](./roadmap-v2-todo-phase-plan.md)                                         |
| 2026-02-25 | 진행        | v2 Phase 3 구현 (AI 중복방지/모델 라우팅/가변 timeout/단계형 UX)                   | [roadmap-v2](./roadmap-v2-todo-phase-plan.md)                                         |
| 2026-02-25 | 결정        | 모델 라우팅 우선순위 확정: Fireworks 3회 룰 > 100자 Kimi 룰                        | [roadmap-v2](./roadmap-v2-todo-phase-plan.md)                                         |
| 2026-02-25 | 결정        | Phase4 착수 전 보안 범위 조정: 자산 name + balance 암호화                          | [roadmap-v2](./roadmap-v2-todo-phase-plan.md)                                         |
| 2026-02-25 | 완료        | 페이즈 잔여 마무리: TX-08 리다이렉트/포커스, PF-04 섹션별 pending 2차              | [roadmap-v2](./roadmap-v2-todo-phase-plan.md)                                         |
| 2026-02-25 | 결정        | 암호화 범위 확대: 자산 + 거래/수입/지출 데이터 민감정보 암호화                     | [roadmap-v2](./roadmap-v2-todo-phase-plan.md)                                         |
| 2026-02-26 | 레거시 완료 | 코드 리뷰 버그 수정 완료                                                           | [history](./history/2026-02-26-01-code-review-bugfix-complete.md)                     |
| 2026-02-26 | 레거시 완료 | 계정 필드 암호화 완료                                                              | [history](./history/2026-02-26-02-field-encryption-complete.md)                       |
| 2026-02-26 | 레거시 완료 | 주간 차트 바텀시트 추가                                                            | [history](./history/2026-02-26-03-weekly-barchart-bottomsheet.md)                     |
| 2026-02-26 | 레거시 완료 | 성능 최적화 묶음 적용                                                              | [history](./history/2026-02-26-04-performance-optimization.md)                        |
| 2026-02-26 | 완료        | 디자인 시스템 전수검사 리뷰 및 모바일 사용성(터치 영역) 보완                       | [history](./history/2026-02-26-05-design-system-inspection.md)                        |
| 2026-02-26 | 완료        | 2차: 디자인 시스템 전수검사 모바일 터치 사용성(Select, Switch) 보완                | [history](./history/2026-02-26-06-design-system-inspection-2nd.md)                    |
| 2026-02-26 | 레거시 완료 | 자산-거래 연결 기능 반영                                                           | [history](./history/2026-02-26-07-asset-transaction-linking.md)                       |
| 2026-02-26 | 레거시 완료 | 성능 개선 1차 마무리                                                               | [history](./history/2026-02-26-08-perf-improvement-phase1.md)                         |
| 2026-03-03 | 제거        | Google OAuth 제거 — 커스텀 도메인 미사용으로 인증 검토 통과 불가                   | [history](./history/2026-03-03-01-remove-google-oauth.md)                             |
| 2026-03-03 | 설정        | Android 패키지 이름 변경 (com.household.app → com.maj0rika.household)              | [history](./history/2026-03-03-02-android-package-rename.md)                          |
| 2026-03-03 | 수정        | 스켈레톤 로딩 디테일 통일 — 모든 탭 풀 스켈레톤 적용                               | [history](./history/2026-03-03-03-skeleton-loading-detail-unify.md)                   |
| 2026-03-09 | 수정        | LLM 프롬프트 고도화 — 수입/지출 판별, 이미지 보조 프롬프트, 입력 예시 문구 개선    | [history](./history/2026-03-09-01-llm-prompt-refinement.md)                           |
| 2026-03-09 | 기능        | 파싱 엔트리포인트 통합 + 계정 데이터 암호화 (name/balance AES-256-GCM)             | [history](./history/2026-03-09-02-parse-entrypoint-unification-account-encryption.md) |
| 2026-03-09 | 수정        | OOD 선필터 완화 — 명백한 비도메인만 차단하고 나머지는 LLM 2차 필터에 위임          | [history](./history/2026-03-09-03-loose-ood-filter.md)                                |
| 2026-03-09 | 수정        | 프롬프트 취소 버튼 아이콘 수정                                                     | [history](./history/2026-03-09-04-prompt-cancel-icon-fix.md)                          |
| 2026-03-09 | 설정        | 개발 환경 정적 캐시 헤더 수정                                                      | [history](./history/2026-03-09-05-dev-cache-header-fix.md)                            |
| 2026-03-09 | 수정        | 웹 파비콘 충돌 정리                                                                | [history](./history/2026-03-09-06-favicon-conflict-fix.md)                            |
| 2026-03-09 | 수정        | Recharts 동적 청크 로드 오류 수정 — 차트 컴포넌트 정적 import로 전환               | [history](./history/2026-03-09-07-recharts-chunk-load-fix.md)                         |
| 2026-03-09 | 수정        | LLM 타임아웃 디버깅 경로 정리 — JSON API 전환, 요청 abort, 서버 로그 추가          | [history](./history/2026-03-09-08-llm-timeout-debugging-fix.md)                       |
| 2026-03-09 | 수정        | LLM 자동 재시도 제거 — 사용자 1회 요청당 벤더 1회 호출로 제한                      | [history](./history/2026-03-09-09-llm-auto-retry-removal.md)                          |
| 2026-03-09 | 성능        | 거래 화면 초기 요청 수 감소 — 초기 서버 액션 제거, 현재 경로 prefetch 제외         | [history](./history/2026-03-09-10-transaction-request-reduction.md)                   |
| 2026-03-09 | 수정        | LLM 타임아웃 상한 증가 — 텍스트/이미지 파싱 대기 시간 완화                         | [history](./history/2026-03-09-11-llm-timeout-threshold-increase.md)                  |
| 2026-03-09 | 수정        | Fireworks 실패 시 Kimi 자동 폴백 — 세션 쿨다운 포함                                | [history](./history/2026-03-09-12-fireworks-kimi-fallback.md)                         |
| 2026-03-09 | 수정        | 파싱 결과 시트 중첩 버튼 구조 수정                                                 | [history](./history/2026-03-09-13-parse-sheet-nested-button-fix.md)                   |
| 2026-03-09 | 기능        | 계정 삭제 기능 추가 (Google Play 정책 준수)                                        | [history](./history/2026-03-09-18-delete-account-feature.md)                          |
| 2026-03-09 | 계획        | 카드 부채/음수 지출 TODO 구체화                                                    | [history](./history/2026-03-09-23-credit-card-billing-negative-expense-todo.md)       |
| 2026-03-10 | 설정        | 작업 규칙/로컬 설정/검토 자산 정리                                                 | [history](./history/2026-03-10-01-worktree-cleanup-review-assets.md)                  |
| 2026-03-10 | 수정        | 면접 준비 문서 재정렬 + React/Next 압축 튜토리얼 추가 + 오래된 설명 사실 검증      | [history](./history/2026-03-10-02-doc-prep-refresh.md)                                |
| 2026-03-10 | 리팩터      | 핵심 흐름 유지보수 주석 보강                                                       | [history](./history/2026-03-10-03-maintainability-comments-pass.md)                   |
| 2026-03-10 | 수정        | 자산/부채 파싱 결과 편집 시 기존 계정 재매칭 누락 수정                             | [history](./history/2026-03-10-04-account-parse-rematch-fix.md)                       |
| 2026-03-10 | 수정        | 파싱 결과 시트 중첩 버튼 구조 수정                                                 | [history](./history/2026-03-10-05-parse-sheet-nested-button-fix.md)                   |
| 2026-03-10 | 수정        | 자산/부채 파싱 기존 계정 매칭 기준을 정확 일치로 조정                              | [history](./history/2026-03-10-06-account-parse-exact-match-only.md)                  |
| 2026-03-10 | 수정        | 인증 세션 조회 실패 복구 경로 보강                                                 | [history](./history/2026-03-10-07-auth-session-error-hardening.md)                    |
| 2026-03-10 | 수정        | 자산/부채 파싱 초기 자동 매칭 완화 + 편집 후 정확 재매칭 분리                      | [history](./history/2026-03-10-08-account-parse-initial-loose-rematch-strict.md)      |
| 2026-03-10 | 수정        | 자산/부채 재매칭 시 업데이트 배지 복원                                             | [history](./history/2026-03-10-09-account-parse-rematch-restores-update-badge.md)     |
| 2026-03-10 | 수정        | 자산/부채 파싱 초기 매칭 복원 경로 추가                                            | [history](./history/2026-03-10-10-account-parse-restore-initial-match.md)             |
| 2026-03-10 | 수정        | 코드리뷰 피드백 반영                                                               | [history](./history/2026-03-10-11-review-feedback-fix.md)                             |
| 2026-03-10 | 설정        | 파이프라인 스킬 승인 게이트 및 리뷰 루프 재설계                                    | [history](./history/2026-03-10-12-pipeline-skill-approval-review-loop.md)             |
| 2026-03-10 | 수정        | Playwright E2E 도입 + 자산 파싱 기존 계정 동기화 보강                              | [history](./history/2026-03-10-13-playwright-e2e-account-parse-manual-test.md)        |
| 2026-03-10 | 설정        | 파이프라인 거버넌스 하드닝                                                         | [history](./history/2026-03-10-14-pipeline-governance-hardening.md)                   |
| 2026-03-10 | 설정        | 파이프라인 상태 계약 명확화                                                        | [history](./history/2026-03-10-15-pipeline-state-contract-clarification.md)           |
| 2026-03-10 | 설정        | 루트 AI 지침과 파이프라인 거버넌스 동기화                                          | [history](./history/2026-03-10-16-root-ai-governance-sync.md)                         |
| 2026-03-10 | 설정        | reviewer 부트스트랩 규약 추가와 히스토리 로그 정렬                                 | [history](./history/2026-03-10-17-reviewer-bootstrap-and-history-order.md)            |
| 2026-03-10 | 수정        | `git diff --check` trailing whitespace 실패 복구                                   | [history](./history/2026-03-10-18-trailing-whitespace-fix.md)                         |
| 2026-03-10 | 리팩터      | Fireworks 설정 체크 표현 정리                                                      | [history](./history/2026-03-10-19-fireworks-availability-check-refactor.md)           |
| 2026-03-10 | 설정        | MiniMax API 키 환경변수 슬롯 추가                                                  | [history](./history/2026-03-10-20-minimax-env-key-slot.md)                            |
| 2026-03-10 | 설정        | MiniMax 텍스트 우선 라우팅 + 이미지 Fireworks 3회 정책 유지                        | [history](./history/2026-03-10-21-minimax-fireworks-kimi-routing.md)                  |
| 2026-03-10 | 제거        | `parse-unified.ts` dead code 제거                                                  | [history](./history/2026-03-10-21-parse-unified-dead-code-removal.md)                 |
| 2026-03-10 | 설정        | Android 최신 Capacitor sync 및 릴리스 빌드 검증                                    | [history](./history/2026-03-10-22-android-capacitor-sync-release-build.md)            |
| 2026-03-16 | 문서        | README 최신화                                                                      | [history](./history/2026-03-16-01-readme-refresh.md)                                  |
| 2026-03-16 | 수정        | Auth/Parse 공개 입력 보안 하드닝                                                   | [history](./history/2026-03-16-02-auth-parse-security-hardening.md)                   |
| 2026-03-16 | 설정        | 거버넌스·스킬·기록 체계 통합                                                       | [history](./history/2026-03-16-02-governance-skill-record-unification.md)             |
| 2026-03-16 | 문서        | Auth/Parse 보안 하드닝 결과 문서화                                                 | [history](./history/2026-03-16-03-security-hardening-docs.md)                         |
| 2026-03-16 | 수정        | Auth/Parse 보안 PR 리뷰 반영                                                       | [history](./history/2026-03-16-04-security-review-followup.md)                        |
| 2026-03-16 | 수정        | Auth/Parse 보안 추가 리뷰 수정                                                     | [history](./history/2026-03-16-05-security-review-fixes.md)                           |
| 2026-03-16 | 수정        | Auth/Parse 보안 후속 회귀 수정                                                     | [history](./history/2026-03-16-06-security-followup-fixes.md)                         |
| 2026-03-16 | 수정        | Parse 유저 quota 차감 시점 및 운영 문서 정정                                       | [history](./history/2026-03-16-07-parse-user-quota-and-doc-fix.md)                    |
| 2026-03-16 | 문서        | PR 구조 정렬 및 템플릿 추가                                                        | [history](./history/2026-03-16-08-pr-template-alignment.md)                           |
| 2026-03-16 | 설정        | 거버넌스 PR 리뷰 피드백 반영                                                       | [history](./history/2026-03-16-09-review-feedback-governance-followup.md)             |
| 2026-03-16 | 설정        | 거버넌스 PR rebase 및 보안 회귀 복구                                               | [history](./history/2026-03-16-10-governance-pr-rebase-security-recovery.md)          |
| 2026-03-16 | 문서        | 문서와 구현 설명 정합성 정리                                                       | [history](./history/2026-03-16-11-doc-sync-alignment.md)                              |
