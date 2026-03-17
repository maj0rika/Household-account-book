## Pipeline State

### 요청 요약
- 너무 크게 세로 분할된 Mermaid 플로우차트의 밀도를 중간 수준으로 다시 조정한다;
- 관련 단계는 재통합하고, 지나치게 세세한 노드는 줄여 한눈에 읽히는 차트로 바꾼다;
- 수정된 문서 기준으로 `docs/flowchart/pdf/` PDF를 다시 생성한다;

### 수용 기준
- [x] 차트가 지나치게 넓지도, 지나치게 길지도 않다;
- [x] 문서별 차트 개수와 노드 수가 과하지 않다;
- [x] 세부 구현 단계는 필요한 만큼만 남기고 나머지는 차트 밖 텍스트로 유지한다;
- [x] 수정된 Markdown 기준으로 PDF가 재생성된다;
- [x] `docs/history/`와 `docs/implementation-plan.md`가 갱신된다;

### 활성 Phase
- PM;

### 스킵 Phase
- UXUI: 제품 UI 변경이 아니라 문서 밀도 조정이다;
- BE: 서버 로직 변경이 없다;
- FE: 앱 코드 변경이 없다;
- Infra: 배포/환경 변경이 없다;
- QA: 문서 전용 작업으로 별도 QA Phase를 실행하지 않는다;

### 승인 이력
- PM 계획 / 승인됨 / 플로우차트 밀도 재조정, 문서 수정, PDF 재생성;

### 변경 패킷
- PM / `docs/flowchart/00`, `02`, `03`, `04`, `05` 재통합 / 문서당 1~2개 핵심 차트로 조정;
- PM / `docs/flowchart/pdf/*.pdf` 재생성 / 폰트, 여백, 간격을 더 촘촘하게 조정;
- PM / `docs/history/2026-03-17-07-flowchart-density-rebalance.md`, `docs/implementation-plan.md` 갱신 / 기록 반영;

### 리뷰 이슈
- 없음;

### QA 상태
- SKIPPED;
- 재시작 지점: 없음;

### PM 최종 판정
- PASS;
- 근거: 대상 문서의 중간 밀도 재구성과 PDF 재생성이 완료되었고 기록 문서까지 반영했다;

### 다음 액션
- 이후 플로우 문서 수정 시에도 중간 밀도 차트 원칙을 유지한다;
