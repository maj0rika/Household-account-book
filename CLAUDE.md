# 가계부 프로젝트 — Claude Code 설정

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
type: feature | fix | refactor | perf | config | remove
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
