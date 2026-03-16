---
date: 2026-03-16
type: docs
---

# PR 구조 정렬 및 템플릿 추가

## 변경 내용

- 기존 merged PR 본문 구조에 맞춰 현재 PR 본문을 재정렬했다;
- 저장소에 `.github/PULL_REQUEST_TEMPLATE.md`를 추가해 이후 PR이 같은 형식을 따르도록 했다;
- 구현 계획서와 파이프라인 상태 파일에 이번 문서/운영 변경을 기록했다;

## 변경된 파일

- .github/PULL_REQUEST_TEMPLATE.md
- docs/history/2026-03-16-08-pr-template-alignment.md
- docs/implementation-plan.md
- docs/pipeline-state/2026-03-16-08-pr-template-alignment.md

## 결정 사항

- PR 템플릿은 기존 merged PR의 제목/섹션 구조를 canonical 형식으로 삼는다;
- 검증 섹션은 성공/실패를 함께 적을 수 있게 두고, 운영 반영 주의사항과 스크린샷 섹션도 기본 포함한다;

## 다음 할 일

- 이후 PR부터는 템플릿을 기준으로 본문을 작성하고, 필요 시 섹션 문구만 미세 조정한다;
