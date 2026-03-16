# 가계부 프로젝트 — Codex 설정

`AGENTS.md`와 `CLAUDE.md`는 같은 저장소 운영 규칙을 유지한다.

## 한글 규칙 (필수)

사고/플래닝/응답/문서 모두 한글. 코드/명령어/기술용어/식별자/파일명은 영어 유지.

## 히스토리 기록 (필수)

**모든 코드 변경은 반드시 `docs/history/`에 기록한다.** 커밋 전에 히스토리 파일을 먼저 작성한다.

### 기록 대상

- UI/UX 변경 (스켈레톤, 레이아웃, 컴포넌트 수정 등)
- 버그 수정
- 기능 추가/제거
- 설정 변경 (인증, 환경변수, 빌드 설정 등)
- 성능 개선
- 리팩토링

### 파일 네이밍

`YYYY-MM-DD-NN-<주제>.md` (같은 날 여러 건이면 NN으로 순번)

### 히스토리 템플릿

```markdown
---
date: YYYY-MM-DD
phase: N (해당 없으면 생략)
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

- 다음 작업 (없으면 생략)
```

### 히스토리 인덱스

`docs/implementation-plan.md` 하단의 히스토리 로그 테이블에 링크를 추가한다.

### 레거시 허용 범위

- 기존 히스토리 파일의 `start | progress | complete | change | issue` 타입은 레거시로 유지한다.
- 기존 히스토리 파일의 날짜-순번 중복은 파일 rename 없이 유지하고, 신규 기록에서만 중복을 금지한다.
- 신규 히스토리는 위 canonical `type`만 사용한다.

## 커밋 컨벤션 (필수)

### 형식

```
type(scope): 한글 설명
```

- **type**: `feat`, `fix`, `refactor`, `perf`, `chore`, `docs`, `style`, `config`, `remove`
- **scope**: 변경 영역 (생략 가능) — `ui`, `auth`, `llm`, `parse`, `security`, `app` 등
- **설명**: 반드시 **한글**로 작성. 기술 용어/고유명사(LLM, Recharts, OAuth 등)만 영어 허용

### 예시

```
feat(auth): 인앱 계정 삭제 기능 추가
fix(ui): Recharts 청크 로드 오류 수정
refactor(llm): 자동 재시도 제거 및 abort signal 추가
perf(ui): 거래 화면 초기 요청 수 감소
chore: .gitignore에 면접 PDF 파일 제외 추가
docs: 히스토리 로그 추가 (프롬프트, 캐시, LLM 수정)
```

### 금지 패턴

- 영어 본문: `fix(ui): resolve chunk load errors` → `fix(ui): 청크 로드 오류 수정`
- 타입 접두사 누락: `LLM 타임아웃 완화` → `fix(llm): LLM 타임아웃 완화`
- 여러 줄 본문이 필요하면 첫 줄은 요약, 빈 줄 후 상세 내용 (Git body)

## AI 작업 거버넌스 (필수)

- 코드/설정 변경, 다단계 문서 변경, 리뷰/배포 작업은 승인형 파이프라인 규칙을 따른다.
- 첫 응답은 항상 `계획`만 제시하고, 사용자 명시적 승인 전에는 구현/검증/커밋/배포를 실행하지 않는다.
- `pm`이 `활성 Phase`와 `스킵 Phase`를 결정한다.
- 상태 파일은 반드시 `docs/pipeline-state/YYYY-MM-DD-NN-<topic>.md`에 생성한다.
- `uxui`, `be`, `fe`, `infra`, `review`, `reviewer`, `qa`, `deploy`는 상태 파일을 읽고 갱신한다.
- 코드/설정 변경은 `reviewer PASS` 전까지 다음 단계로 진행하지 않는다.
- `qa PASS` 전에는 `pm` 최종 재검증으로 진행하지 않는다.
- `pm PASS` 전에는 Record와 Deploy를 진행하지 않는다.
- `commit`, `push`, `deploy`는 리뷰 통과 후에도 별도 승인 없이는 실행하지 않는다.
- 단순 정보 조회/탐색/질문 답변처럼 변경이 없는 작업에는 이 거버넌스를 강제하지 않는다.
- 상태 파일 필수 섹션은 `요청 요약`, `수용 기준`, `활성 Phase`, `스킵 Phase`, `승인 이력`, `변경 패킷`, `리뷰 이슈`, `QA 상태`, `PM 최종 판정`, `다음 액션`으로 고정한다.

## Code Style

1. 탭(4칸) 고정, 스페이스 혼용 금지
2. 모든 문장 끝 `;` 명시
3. `camelCase`(변수·함수) / `PascalCase`(클래스) / `SNAKE_CASE`(상수)
4. `const` 우선, 필요 시 `let`, `var` 금지
5. 화살표 함수 우선, 함수형 패턴 선호
6. 핵심 로직 상단에 한글 `// 설명`, 과다 주석 지양
7. 항상 `===`, `!==`
8. 템플릿 리터럴 우선 `${}`
9. 구조분해·전개 연산자, early return 권장
10. ES `import`/`export`, `require` 지양

## 프로젝트 구조

- **프레임워크**: Next.js 15 + TypeScript + Tailwind CSS 4 + Supabase + Drizzle ORM
- **인증**: Better Auth (이메일/비밀번호만)
- **UI**: shadcn/ui + Recharts + Vaul
- **구현 계획서**: `docs/implementation-plan.md`
- **디자인 시스템**: `docs/design-system.md`
- **코드 품질 가이드**: `docs/code-quality.md`
