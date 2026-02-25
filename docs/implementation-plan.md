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
- [ ] Google 소셜 로그인 (GOOGLE_CLIENT_ID 미설정 — 추후)
- [x] 인증 미들웨어 (보호된 라우트)
- [x] 로그인/회원가입 페이지 UI

### Phase 4: LLM 파서 (핵심 기능) ✅
- [x] 파싱 결과 타입 정의 (ParsedTransaction, ParseResponse)
- [x] 프롬프트 템플릿 작성 (카테고리 동적 삽입, 한국어 금액/상대 날짜 규칙)
- [x] LLM 클라이언트 팩토리 (OpenAI SDK 기반, baseURL로 openai/kimi 전환)
- [x] 통합 파싱 함수 (LLM 호출 → JSON 추출 → 유효성 검증 + 재시도)
- [x] 파싱 Server Action + API Route (/api/parse)
- [x] 에러 핸들링 (재시도 1회, 실패 시 에러 메시지 반환)
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
- [x] 이미지 파싱 (OpenAI Vision, base64 전송, 영수증/카드내역 인식)

### Phase 12: 디자인 폴리싱 ✅
- [x] Glassmorphism 탭바/네비게이션
- [x] Framer Motion 애니메이션 (리스트 추가, Bottom Sheet, 차트 업데이트)
- [x] Mesh Gradient 대시보드 카드
- [x] Pretendard + Geist 폰트 적용
- [x] 마이크로 인터랙션 (active:scale, 탭 인디케이터, 호버 효과)
- [x] 스켈레톤 로딩 (페이지별 loading.tsx)

### Phase 12: Capacitor (네이티브 앱)
- [ ] Capacitor 설치 + 설정
- [ ] Next.js 정적 export 설정
- [ ] API Route 래핑 (Server Actions → fetch 호출)
- [ ] iOS 빌드 + 테스트
- [ ] Android 빌드 + 테스트
- [ ] Share Extension (메시지 공유 → 자동 파싱)

### Phase 13: 배포
- [ ] Vercel 연동 (웹 배포)
- [ ] 환경변수 설정 (Vercel Dashboard)
- [ ] 도메인 연결 (선택)
- [ ] 앱스토어 제출 (iOS + Android)

---

## v1.1 확장 기능

### Phase 14: N분의 1 정산 (더치페이) 🆕
내가 카드로 전체 결제 후, 친구들에게 각자 몫을 청구/추적.

- [ ] DB 스키마: settlements, settlement_members 테이블
- [ ] 거래 저장 후 "정산하기" 버튼 → 인원 입력 → N등분
- [ ] 정산 현황 대시보드 (받아야 할 금액, 완료/미완료)
- [ ] 개별 정산 완료 체크
- [ ] 카카오페이/토스 딥링크 연동 (송금 요청 URL)

### Phase 15: 예산 알림
- [ ] 카테고리별/전체 월 예산 설정
- [ ] 예산 초과 시 알림 (웹 + 푸시)
- [ ] 예산 대비 지출 진행률 바

### Phase 16: 거래 검색/필터 ✅
- [x] 키워드/카테고리/유형 검색 (클라이언트 사이드 필터링)
- [x] 카테고리 다중 선택
- [x] 필터 조합 (AND)
- [x] 검색 결과 내 통계 (건수, 합계)

### Phase 18A: 자산/부채 관리 ✅
- [x] DB 스키마: accounts 테이블 (자산/부채 통합)
- [x] transactions.accountId FK 추가 (nullable, 하위 호환)
- [x] 계정 CRUD Server Actions
- [x] `/assets` 페이지 (순자산 요약 카드 + 자산/부채 목록)
- [x] 계정 추가/수정 Drawer (이름, 유형, 세부유형, 아이콘, 잔액)
- [x] 네비게이션에 자산 탭 추가

### Phase 17: AI 학습 개선 + 음성 입력
- [ ] 사용자 수정 피드백 반영 (파싱 정확도 향상)
- [ ] 음성 입력 (Web Speech API / Capacitor 마이크)
- [ ] 영수증 사진 OCR → 파싱

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
phase: N
type: start | progress | complete | change | issue
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

---

## 히스토리 로그

| 날짜 | 구분 | 제목 | 링크 |
|------|------|------|------|
| 2026-02-24 | 설계 | 프로젝트 설계 완료 (브레인스토밍) | [brainstorm](./brainstorms/2026-02-24-household-account-book-brainstorm.md) |
| 2026-02-24 | 계획 | 구현 계획서 작성 | 이 문서 |
| 2026-02-24 | 완료 | Phase 1 프로젝트 초기화 완료 | [history](./history/2026-02-24-02-phase1-initialization-complete.md) |
| 2026-02-24 | 진행 | Phase 2 DB + ORM 진행 | [history](./history/2026-02-24-03-phase2-db-orm-progress.md) |
| 2026-02-24 | 진행 | Phase 3 인증 진행 | [history](./history/2026-02-24-04-phase3-auth-progress.md) |
| 2026-02-24 | 완료 | Phase 2 DB + ORM 완료 (Supabase 연동) | [history](./history/2026-02-24-04-phase2-db-orm-complete.md) |
| 2026-02-24 | 완료 | Phase 3 인증 완료 | [history](./history/2026-02-24-05-phase3-auth-complete.md) |
| 2026-02-25 | 완료 | Phase 4 LLM 파서 구현 완료 | [history](./history/2026-02-25-01-phase4-llm-parser-complete.md) |
| 2026-02-25 | 완료 | Phase 5 핵심 UI 구현 완료 | — |
| 2026-02-25 | 완료 | Phase 6 대시보드 + 통계 구현 완료 | — |
| 2026-02-25 | 완료 | Phase 7 메시지/은행 내역 연동 완료 | [history](./history/2026-02-25-02-phase7-bank-message-complete.md) |
| 2026-02-25 | 완료 | Phase 8~10 통계/예산/설정 페이지 구현 (LNB 전체 접근 가능) | — |
| 2026-02-25 | 완료 | 디자인 시스템 수립 + 시드 스크립트 개선 + 인증 접근 제어 | — |
| 2026-02-25 | 완료 | Phase 11 UX 고도화 (고정거래 프롬프트, 파싱편집, Sidebar토글, 이미지파싱) | — |
| 2026-02-25 | 완료 | Phase 12 디자인 폴리싱 (Motion, Mesh Gradient, Pretendard, Skeleton) | — |
| 2026-02-25 | 계획 | v2 TODO + 페이즈 계획 수립 | [roadmap-v2](./roadmap-v2-todo-phase-plan.md) |
| 2026-02-25 | 결정 | v2 요구사항 의사결정 반영 (월점프/차트필터/리다이렉트/암호화 범위) | [roadmap-v2](./roadmap-v2-todo-phase-plan.md) |
| 2026-02-25 | 결정 | 추가 확정: 자산 선택 1회 기본+설정 변경, 중복판정 2A, Kimi 임계치 100자, soft 제한 | [roadmap-v2](./roadmap-v2-todo-phase-plan.md) |
| 2026-02-25 | 진행 | v2 Phase 1 1차 구현 (월점프/주간필터/아코디언/금액포맷/차트상세) | [roadmap-v2](./roadmap-v2-todo-phase-plan.md) |
| 2026-02-25 | TODO | 리스크 후속 항목 추가 (월 전환 vs 주간 필터 정합성) | [roadmap-v2](./roadmap-v2-todo-phase-plan.md) |
| 2026-02-25 | 완료 | 리스크 보완: 월 전환과 주간 필터 범위 정합성 개선(TX-09) | [roadmap-v2](./roadmap-v2-todo-phase-plan.md) |
