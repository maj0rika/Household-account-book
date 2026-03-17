## Pipeline State

### 요청 요약
- `docs/flowchart/pdf/*.pdf`에서 빈 페이지와 과도한 상하 여백을 줄인다;
- Mermaid 차트 내용은 유지하되 PDF 출력용 페이지 분할과 여백 규칙을 수정해 다시 생성한다;

### 수용 기준
- [x] PDF에서 큰 빈 페이지 또는 과도한 상하 여백이 줄어든다;
- [x] 차트 블록이 불필요하게 다음 페이지로 밀리지 않는다;
- [x] 차트 자체 가독성은 유지된다;
- [x] 수정된 PDF가 다시 생성된다;
- [x] `docs/history/`와 `docs/implementation-plan.md`가 갱신된다;

### 활성 Phase
- PM;

### 스킵 Phase
- UXUI: 앱 UI 변경이 아니라 PDF 출력 레이아웃 조정이다;
- BE: 서버 로직 변경이 없다;
- FE: 앱 코드 변경이 없다;
- Infra: 배포/환경 변경이 없다;
- QA: 문서 전용 작업으로 별도 QA Phase를 실행하지 않는다;

### 승인 이력
- PM 계획 / 승인됨 / PDF pagination 수정, 출력 재생성, 기록 반영;

### 변경 패킷
- `docs/flowchart/pdf/*.pdf`를 문서 높이 기반 단일 페이지 PDF로 재생성했다;
- 대표 산출물 `00-navigation-overview.pdf`, `02-transaction-manual-and-parse.pdf`, `05-date-filter-and-statistics-flows.pdf`가 모두 1페이지로 출력되는 것을 확인했다;
- `docs/history/2026-03-17-08-pdf-pagination-fix.md`를 추가하고 `docs/implementation-plan.md` 히스토리 로그를 갱신했다;

### 리뷰 이슈
- 없음;

### QA 상태
- SKIPPED;
- 재시작 지점: 없음;

### PM 최종 판정
- PASS;
- 근거: PDF를 단일 페이지로 재생성했고, 대표 문서의 페이지 수가 1페이지로 검증됐으며 기록 문서도 갱신했다;

### 다음 액션
- 사용자 확인이 필요하다;
