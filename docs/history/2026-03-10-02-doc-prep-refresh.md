---
date: 2026-03-10
type: fix
---

# 면접 준비 문서 재정렬 및 사실 검증

## 변경 내용

- `docs/interview-questions.md`에 1주 압축 학습 섹션을 추가하고, 필수/보조/후순위 질문을 재분류했다.
- `docs/interview-deep-dive.md`의 현재 코드와 어긋난 설명을 수정했다.
- `docs/interview-live-demo.md`를 추가해 라이브 화면 설명 순서와 답변 스크립트를 정리했다.
- `docs/tutorial/`에 React/Next 핵심 4개 문서를 추가하고, `README`에 1주 압축 범위를 명시했다.
- 오래된 OAuth 안내가 남아 있던 `docs/project-identity.md`를 현재 인증 구조 기준으로 정리했다.

## 변경된 파일

- docs/interview-questions.md
- docs/interview-deep-dive.md
- docs/interview-live-demo.md
- docs/tutorial/README.md
- docs/tutorial/1-2-props-hooks.md
- docs/tutorial/3-2-server-client-components.md
- docs/tutorial/3-3-suspense-loading-cache.md
- docs/tutorial/3-4-server-actions-revalidate-path.md
- docs/project-identity.md
- docs/implementation-plan.md

## 결정 사항

- 기존 방대한 질문집은 유지하되, 면접 1주 전 기준으로 바로 외울 수 있는 압축본을 상단에 추가한다.
- React/Next 학습은 일반론보다 이 레포에서 실제로 쓰는 패턴(`Server/Client`, `Suspense`, `Server Actions`, `revalidatePath`) 중심으로 제한한다.
- 라이브 면접 대비 문서는 화면 전개 순서와 파일 진입점을 고정해 설명 훈련용으로 사용한다.

## 다음 할 일

- 라이브 데모 스크립트를 기준으로 60초 소개와 3분 구조 설명을 실제 화면과 함께 반복 연습한다.
- 꼬리 질문 5개를 선정해 답변을 녹음하거나 소리 내어 점검한다.
