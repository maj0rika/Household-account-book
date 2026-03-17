## Pipeline State

### 요청 요약
- 사용자 관점의 전체 앱 플로우를 코드 기준 Mermaid 플로우차트로 문서화한다;
- 네비게이션 이동, 인증, 거래 입력/파싱/수정/저장, 자산/부채 분기, 카테고리 관리, 날짜 이동, 필터링 등 주요 액션 흐름을 `docs/flowchart/`에 Markdown으로 정리한다;
- 각 문서에 대응하는 PDF를 `docs/flowchart/pdf/`에 생성한다;

### 수용 기준
- [x] 실제 라우트, 클라이언트 컴포넌트, 서버 액션/API, DB 처리 흐름이 차트에 반영된다;
- [x] 회원가입, 로그인, 유저 삭제, 날짜 이동, 거래내역 필터링, 수동 입력, 이미지 파싱, 파싱 수정 저장, 자산/부채 분기, 카테고리 추천/추가/수정/삭제 흐름이 포함된다;
- [x] 사용자가 수행 가능한 핵심 액션을 문서별로 구분해 `docs/flowchart/*.md`에 정리한다;
- [x] 대응 PDF가 `docs/flowchart/pdf/*.pdf`에 생성된다;
- [x] `docs/history/`와 `docs/implementation-plan.md` 히스토리 로그가 갱신된다;

### 활성 Phase
- PM;

### 스킵 Phase
- UXUI: 기존 구현 흐름을 문서화하는 작업이다;
- BE: 서버 로직 변경이 아니라 코드 분석 및 문서화가 목적이다;
- FE: 화면 구현 변경이 목적이 아니다;
- Infra: 배포/환경 변경이 없다;
- QA: 문서 전용 작업으로 별도 QA Phase를 실행하지 않는다;

### 승인 이력
- PM 계획 / 승인됨 / 전체 플로우 문서화, Mermaid 작성, PDF 생성;

### 변경 패킷
- PM / `docs/flowchart/00-navigation-overview.md` 외 6개 문서 추가 / 사용자 액션별 Mermaid 차트 정리;
- PM / `docs/flowchart/pdf/*.pdf` 생성 / 각 문서 대응 PDF 출력 완료;
- PM / `docs/history/2026-03-17-05-user-flowchart-docs.md`, `docs/implementation-plan.md` 갱신 / 문서 변경 기록 반영;

### 리뷰 이슈
- 없음;

### QA 상태
- SKIPPED;
- 재시작 지점: 없음;

### PM 최종 판정
- PASS;
- 근거: 요청 범위의 플로우 문서와 PDF가 생성되었고, 문서 전용 작업으로 QA는 스킵했다;

### 다음 액션
- 추가 기능 도입 시 대응 플로우 문서와 PDF를 함께 갱신한다;
