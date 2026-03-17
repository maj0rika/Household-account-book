## Pipeline State

### 요청 요약
- 좌우로 지나치게 긴 Mermaid 플로우차트의 가독성을 개선한다;
- 긴 차트는 세로형(`flowchart TD`) 중심으로 재배치하고, 필요 시 여러 단계 차트로 분리한다;
- 수정된 문서 기준으로 `docs/flowchart/pdf/` PDF를 다시 생성한다;

### 수용 기준
- [x] 가로로 과도하게 펼쳐진 차트가 세로 중심 구조로 재작성된다;
- [x] 긴 노드 라벨은 줄이고 세부 설명은 차트 밖 텍스트로 이동한다;
- [x] 복합 흐름 차트는 단계별로 적절히 분리된다;
- [x] 수정된 Markdown 기준으로 PDF가 재생성된다;
- [x] `docs/history/`와 `docs/implementation-plan.md`가 갱신된다;

### 활성 Phase
- PM;

### 스킵 Phase
- UXUI: 제품 UI 변경이 아니라 문서 레이아웃 조정이다;
- BE: 서버 로직 변경이 없다;
- FE: 앱 코드 변경이 없다;
- Infra: 배포/환경 변경이 없다;
- QA: 문서 전용 작업으로 별도 QA Phase를 실행하지 않는다;

### 승인 이력
- PM 계획 / 승인됨 / 플로우차트 가독성 개선, 문서 수정, PDF 재생성;

### 변경 패킷
- PM / `docs/flowchart/00-navigation-overview.md`, `02`, `03`, `04`, `05` 재구성 / 세로형 소차트 분리;
- PM / `docs/flowchart/pdf/00`, `02`, `03`, `04`, `05` PDF 재생성 / 레이아웃 반영;
- PM / `docs/history/2026-03-17-06-flowchart-readability-fix.md`, `docs/implementation-plan.md` 갱신 / 기록 반영;

### 리뷰 이슈
- 없음;

### QA 상태
- SKIPPED;
- 재시작 지점: 없음;

### PM 최종 판정
- PASS;
- 근거: 대상 문서의 세로형 재구성과 PDF 재생성이 완료되었고 문서 기록까지 반영했다;

### 다음 액션
- 신규 플로우차트도 같은 세로형 소차트 원칙으로 유지한다;
