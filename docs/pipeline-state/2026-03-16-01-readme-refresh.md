## Pipeline State

### 요청 요약
- `README.md`를 현재 프로젝트 상태에 맞게 최신화한다;

### 수용 기준
- [x] 현재 구현된 핵심 기능과 미구현 범위를 README에 반영한다;
- [x] 실제 사용 중인 기술 스택, 환경변수, 주요 스크립트를 README에 반영한다;
- [x] 로컬 실행, DB 초기화, 검증, Capacitor 관련 기본 실행 절차를 README에 정리한다;
- [x] 변경 이력을 `docs/history/`와 `docs/implementation-plan.md`에 남긴다;

### 활성 Phase
- PM;

### 스킵 Phase
- UXUI: 신규 UX 설계 없이 기존 기능 상태를 문서화하는 작업이다;
- BE: 서버 로직이나 스키마 변경이 없다;
- FE: UI 구현 변경이 없다;
- Infra: 배포/설정 변경이 없다;
- QA: 실행 결과 검증이 아닌 문서 정합성 검토로 충분하다;

### 승인 이력
- PM 계획 / 승인됨 / README 최신화 범위 확인 및 문서 반영;

### 변경 패킷
- PM / `README.md`, `docs/history/2026-03-16-01-readme-refresh.md`, `docs/implementation-plan.md`, `docs/pipeline-state/2026-03-16-01-readme-refresh.md` / 문서 정합성 점검;

### 리뷰 이슈
- 열린 이슈 0개;

### QA 상태
- SKIPPED;
- 재시작 지점: 없음;

### PM 최종 판정
- PASS;
- 근거: README가 현재 구현 범위, 실행 절차, 환경변수, 주요 명령을 반영하도록 정리되었고 관련 기록 문서가 함께 갱신되었다;

### 다음 액션
- 필요 시 README에 스크린샷, 배포 URL, 앱스토어 링크를 추가한다;
