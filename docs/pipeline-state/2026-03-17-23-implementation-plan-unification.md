## Pipeline State

### 요청 요약
- `implementation-plan`을 단일 기준 문서로 통합하고, `roadmap-v2`는 이관 안내 문서로 축소한다;

### 수용 기준
- [x] `implementation-plan`만 읽어도 현재 구현 범위, 확장 Phase, backlog, 결정 로그를 이해할 수 있다;
- [x] `roadmap-v2`는 기준 문서가 `implementation-plan`임을 즉시 알 수 있는 레거시 포인터로 축소된다;
- [x] `README.md`와 `docs/project-identity.md`가 단일 기준 문서 원칙과 어긋나지 않는다;
- [x] `scripts/validate-governance.mjs` 기준 검증이 계속 통과한다;

### 활성 Phase
- PM;

### 스킵 Phase
- UXUI: 화면/상호작용 변경이 아닌 문서 구조 정리 작업이다;
- BE: 서버 로직이나 데이터 모델 변경이 없다;
- FE: UI 구현 변경이 없다;
- Infra: 배포/빌드 설정 변경이 없다;
- QA: 문서 전용 작업이라 별도 QA Phase를 실행하지 않는다;
- Deploy: 배포 대상 변경이 없다;

### 승인 이력
- PM 계획 / 승인됨 / 범위: 계획 문서 통합, 레거시 포인터 정리, 참조 문서 표현 보강;

### 변경 패킷
- PM / `docs/implementation-plan.md`, `docs/roadmap-v2-todo-phase-plan.md`, `README.md`, `docs/project-identity.md`, `docs/history/2026-03-17-23-implementation-plan-unification.md` / 단일 기준 문서화, 레거시 포인터 정리, 안내 문구 보강;

### 리뷰 이슈
- 없음;

### QA 상태
- SKIPPED;
- 재시작 지점: 없음;

### PM 최종 판정
- PASS;
- 근거: 기준 문서와 레거시 포인터 역할이 분리되어 재정의됐고, 거버넌스 검증도 유지된다;

### 다음 액션
- 이후 backlog 추가와 계획 변경은 `docs/implementation-plan.md`만 수정 대상으로 삼는다;
