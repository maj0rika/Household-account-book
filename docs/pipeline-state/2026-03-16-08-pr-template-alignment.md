## Pipeline State

### 요청 요약
- 현재 PR 본문 구조를 기존 merged PR 형식에 맞추고 저장소에 PR 템플릿 파일을 추가한다;

### 수용 기준
- [x] 현재 PR 본문이 기존 PR #1과 같은 섹션 구조를 따른다;
- [x] `.github/PULL_REQUEST_TEMPLATE.md`가 생성된다;
- [x] 변경 이력이 `docs/history/`와 `docs/implementation-plan.md`에 기록된다;

### 활성 Phase
- PM;
- Infra;

### 스킵 Phase
- UXUI: 제품 화면/인터랙션 변경이 없다;
- BE: 런타임 로직 변경이 없다;
- FE: 제품 UI 구현 변경이 없다;
- Deploy: 브랜치와 PR 메타데이터 정리 작업이며 배포 범위가 아니다;

### 승인 이력
- PM 계획 / 승인됨 / PR 구조 정렬과 템플릿 추가 범위;

### 변경 패킷
- PM / `docs/history/2026-03-16-08-pr-template-alignment.md`, `docs/implementation-plan.md`, `docs/pipeline-state/2026-03-16-08-pr-template-alignment.md` / 기록 문서 추가;
- Infra / `.github/PULL_REQUEST_TEMPLATE.md`, GitHub PR 본문 수정 / PR 템플릿과 메타데이터 정리;

### 리뷰 이슈
- 열린 이슈 0개;

### QA 상태
- PASS;
- 재시작 지점: 없음;

### PM 최종 판정
- PASS;
- 근거: PR 구조와 템플릿이 기존 merged PR 형식에 맞게 정리되고 기록 문서도 함께 반영되었다;

### 다음 액션
- 현재 브랜치에 커밋을 추가하고 PR 본문을 새 템플릿 구조로 갱신한다;
