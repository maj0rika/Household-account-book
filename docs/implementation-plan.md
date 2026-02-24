# 구현 계획서 (Implementation Plan)

> **프로젝트**: AI 자동 분류 가계부 앱
> **시작일**: 2026-02-24
> **설계 문서**: [brainstorm](./brainstorms/2026-02-24-household-account-book-brainstorm.md)

---

## 구현 순서

전체 구현을 **Phase** 단위로 나누고, 각 Phase 완료 시 히스토리를 기록한다.

### Phase 1: 프로젝트 초기화
- [ ] Next.js 15 + TypeScript 프로젝트 생성
- [ ] Tailwind CSS 4 설정
- [ ] shadcn/ui 초기화
- [ ] ESLint + Prettier 설정
- [ ] 디렉토리 구조 생성
- [ ] Git 초기화 + .gitignore
- [ ] 환경변수 템플릿 (.env.example)

### Phase 2: DB + ORM 셋업
- [ ] Supabase 프로젝트 생성
- [ ] Drizzle ORM 설정 (drizzle.config.ts)
- [ ] DB 스키마 정의 (users, categories, transactions, budgets)
- [ ] 마이그레이션 생성 및 실행
- [ ] 시드 데이터 (기본 카테고리)

### Phase 3: 인증
- [ ] Better Auth 설정
- [ ] 이메일/비밀번호 가입 + 로그인
- [ ] Google 소셜 로그인
- [ ] 인증 미들웨어 (보호된 라우트)
- [ ] 로그인/회원가입 페이지 UI

### Phase 4: LLM 파서 (핵심 기능)
- [ ] TransactionParser 인터페이스 정의
- [ ] OpenAI 구현체 (GPT-4o-mini)
- [ ] 프롬프트 템플릿 작성
- [ ] 파싱 Server Action (또는 API Route)
- [ ] KIMI 구현체 (프로바이더 교체 가능 구조)
- [ ] Rate Limiting
- [ ] 에러 핸들링 + 수동 입력 폴백

### Phase 5: 핵심 UI (모바일 퍼스트)
- [ ] 레이아웃: 하단 탭바 (모바일) / 사이드바 (데스크톱)
- [ ] 자연어 입력바 (하단 고정, 포커스 시 확장)
- [ ] AI 파싱 결과 Bottom Sheet (확인/수정/저장)
- [ ] 거래 목록 (날짜별 그룹, 스와이프 삭제)
- [ ] 수동 입력 폼 (폴백)

### Phase 6: 대시보드 + 통계
- [ ] 월별 요약 카드 (수입/지출/잔액)
- [ ] 카테고리별 지출 차트
- [ ] 주간 미니 바 차트
- [ ] 월 선택 네비게이션

### Phase 7: 카테고리 + 설정
- [ ] 카테고리 목록 / 추가 / 수정 / 삭제
- [ ] 프로필 설정
- [ ] 다크모드 토글

### Phase 8: 디자인 폴리싱
- [ ] Glassmorphism 탭바/네비게이션
- [ ] Framer Motion 애니메이션 (리스트 추가, Bottom Sheet, 차트 업데이트)
- [ ] Mesh Gradient 대시보드 카드
- [ ] Pretendard + SF Pro Display 폰트 적용
- [ ] 마이크로 인터랙션 (active:scale, 햅틱 피드백)
- [ ] 스켈레톤 로딩 (AI 처리 대기)

### Phase 9: Capacitor (네이티브 앱)
- [ ] Capacitor 설치 + 설정
- [ ] Next.js 정적 export 설정
- [ ] API Route 래핑 (Server Actions → fetch 호출)
- [ ] iOS 빌드 + 테스트
- [ ] Android 빌드 + 테스트
- [ ] 앱스토어 제출 준비

### Phase 10: 배포
- [ ] GitHub 레포 생성
- [ ] Vercel 연동 (웹 배포)
- [ ] 환경변수 설정 (Vercel Dashboard)
- [ ] 도메인 연결 (선택)
- [ ] 앱스토어 제출 (iOS + Android)

---

## v1.1 (추후)
- [ ] 예산 설정 & 알림
- [ ] 거래 검색/필터
- [ ] 월별/연별 통계 차트 확장
- [ ] 반복 거래 (월세, 구독료 등)
- [ ] AI 학습 개선 (사용자 수정 피드백 반영)
- [ ] 음성 입력 지원

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
