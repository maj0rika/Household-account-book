---
date: 2026-03-10
type: config
---

# 작업 규칙/로컬 설정/검토 자산 정리

## 변경 내용

- `CLAUDE.md`에 `type(scope): 한글 설명` 형식의 커밋 컨벤션을 추가했다.
- `.gitignore`에 `.claude/settings.local.json`을 추가해 개인 로컬 설정이 저장소에 섞이지 않도록 했다.
- `.env.example`과 `scripts/create-review-account.ts`를 정리해 Google Play 심사용 테스트 계정을 env 기반으로 재생성/재설정할 수 있게 했다.
- `src/app/favicon.ico`와 `.serena/project.yml`을 최신 상태로 정리했다.
- `docs/implementation-plan.md` 히스토리 로그에 전날 TODO 기록과 이번 정리 기록 링크를 추가했다.

## 변경된 파일

- CLAUDE.md
- .gitignore
- .env.example
- scripts/create-review-account.ts
- src/app/favicon.ico
- .serena/project.yml
- docs/implementation-plan.md
- docs/history/2026-03-10-01-worktree-cleanup-review-assets.md

## 결정 사항

- 개인용 Claude Desktop 설정은 저장소가 아니라 각 개발자 로컬 환경에서만 유지한다.
- 심사용 테스트 계정은 수동 DB 수정 대신 재실행 가능한 스크립트로 관리하고, 자격증명은 env로만 주입한다.
- Serena 프로젝트 설정은 계속 추적하고, 이번 자동 추가 필드는 설정 스키마 동기화로 간주한다.

## 다음 할 일

- Google Play 심사용 계정 생성 절차를 운영 문서나 배포 체크리스트와 연결한다.
