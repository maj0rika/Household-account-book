---
date: 2026-03-16
type: docs
---

# README 최신화

## 변경 내용

- `README.md`를 현재 프로젝트 기준의 한글 문서로 전면 정리했다;
- 구현 완료 기능, 진행 예정 기능, 기술 스택, 환경변수, 실행/검증/Capacitor 명령을 README에 반영했다;
- `docs/implementation-plan.md` 히스토리 로그에 이번 문서 갱신 기록을 추가했다;
- 파이프라인 상태 파일을 생성해 이번 문서 작업의 승인 범위와 판정을 남겼다;

## 변경된 파일

- README.md
- docs/history/2026-03-16-01-readme-refresh.md
- docs/implementation-plan.md
- docs/pipeline-state/2026-03-16-01-readme-refresh.md

## 결정 사항

- README는 짧은 소개 수준이 아니라 실제 온보딩 문서 역할을 하도록 재구성한다;
- 문서만 변경하는 요청이므로 활성 Phase는 `PM`만 사용하고 나머지 실행형 Phase는 스킵한다;
- 환경변수 설명은 `.env.example`과 `docs/project-identity.md` 기준으로 맞춘다;

## 다음 할 일

- 배포 URL, 스크린샷, 앱스토어 제출 상태가 확정되면 README 배포 섹션을 보강한다;
