---
date: 2026-03-16
type: docs
---

# 문서와 구현 설명 정합성 정리

## 변경 내용

- 구현과 어긋난 문서 설명, 정책 페이지 문구, 깨진 링크와 충돌 표식을 정리했다;
- `implementation-plan`의 히스토리 인덱스와 참고 링크를 현재 저장소 상태 기준으로 보정했다;
- 인증/LLM 라우팅과 달라진 개인정보처리방침, 이용약관, 디자인/셋업 문서를 최신 구현에 맞췄다;
- `code-quality` 문서의 raw control 규칙을 실제 예외 패턴 기준으로 보강했다;

## 변경된 파일

- README.md
- docs/code-quality.md
- docs/design-system.md
- docs/implementation-plan.md
- docs/project-identity.md
- src/app/privacy/page.tsx
- src/app/terms/page.tsx
- docs/history/2026-03-16-11-doc-sync-alignment.md
- docs/pipeline-state/2026-03-16-11-doc-sync-alignment.md

## 결정 사항

- 누락된 설계 문서를 새로 추정 작성하지 않고, 현재 저장소에 존재하는 근거만 링크한다;
- 정책 페이지는 현재 서비스가 실제로 제공하는 인증/AI 처리 경로만 명시한다;
- 구현 문서의 규칙은 실제 코드가 반복적으로 사용하는 패턴 기준으로 맞춘다;

## 다음 할 일

- 남아 있는 학습용 주석/실험성 변경은 별도 작업으로 분리한다;
