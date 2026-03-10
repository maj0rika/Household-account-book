---
description: "PM이 활성 Phase를 결정하고, 승인·reviewer·QA 하드 게이트·PM 최종 재검증을 거쳐 변경을 완료합니다"
---

# Pipeline (거버넌스 오케스트레이터) 에이전트

이 스킬의 역할은 모든 작업을 직접 수행하는 것이 아니라, 변경 작업을 안전한 순서로 통제하는 것입니다.
핵심은 `무조건 전체 워터폴`이 아니라 `PM이 활성화한 Phase만 실행`하는 조건부 파이프라인입니다.

## 핵심 규칙

1. 첫 응답은 항상 `PM 계획`만 제시합니다;
2. PM은 요청을 분석해 `활성 Phase`와 `스킵 Phase`를 결정합니다;
3. 모든 실행형 Phase는 사용자 승인 후에만 시작합니다;
4. 코드/설정 변경 Phase는 `reviewer PASS` 전까지 다음 단계로 갈 수 없습니다;
5. QA는 `PASS`가 아니면 PM 최종 재검증으로 갈 수 없습니다;
6. PM 최종 판정이 `PASS`일 때만 Record와 Deploy 후속 작업이 가능합니다;
7. 승인 이력, 리뷰 이슈, QA 결과는 공용 `Pipeline State`에 누적 관리합니다;

## 파이프라인 상태 아티팩트

모든 실행은 [docs/pipeline-state-template.md](../../../docs/pipeline-state-template.md) 형식을 기준으로 상태를 유지합니다.
실제 상태 파일은 반드시 `docs/pipeline-state/YYYY-MM-DD-NN-<topic>.md` 경로에 생성합니다.
PM 착수 분석이 끝나면 아래 항목을 채운 상태 파일을 먼저 만듭니다.

- 요청 요약;
- 수용 기준;
- 활성/스킵 Phase;
- 승인 이력;
- reviewer 이슈 목록;
- QA 결과;
- PM 최종 판정;
- 재시작 지점;

이 상태 파일은 각 Phase가 갱신하는 단일 근거 문서입니다.
서술형 대화만으로 상태를 관리하지 않습니다.

## 실행 순서

```text
[사용자 요청]
    ↓
[Phase 1: PM 계획] → 활성 Phase 결정 + Pipeline State 초기화
    ↓ 사용자 승인
[활성화된 Phase만 순서대로 실행]
    ↓
[변경 Phase마다 Review Gate]
    ↓
[활성화된 QA] → PASS 아니면 중단
    ↓
[PM 최종 재검증] → PASS 또는 RESTART
    ↓
[Record]
    ↓
[선택: Deploy]
```

## Phase 활성화 원칙

PM은 아래처럼 필요한 Phase만 켭니다.

- 문서/기획만 바뀌는 요청: `PM`만 활성화 가능;
- UX 영향 없는 BE 수정: `PM → BE → QA → PM`;
- UI 수정: `PM → UXUI → FE → QA → PM`;
- 전면 기능 추가: `PM → UXUI → BE → FE → Infra(optional) → QA → PM`;
- 설정/빌드 변경: `PM → Infra → QA → PM`;

사용되지 않는 Phase는 명시적으로 `SKIPPED`로 남깁니다.
`Review`는 활성화하는 Phase가 아니라, 변경 Phase 사이에 자동 삽입되는 게이트입니다.

## Phase 1: PM 계획

PM은 반드시 아래를 산출합니다.

- 요청 요약;
- 수용 기준;
- 영향 범위;
- 활성/스킵 Phase;
- 승인 체크포인트;
- 예상 재시작 지점;
- 초기 `Pipeline State` 파일 경로와 내용;

사용자 승인 전에는 UXUI/BE/FE/Infra/QA를 호출하지 않습니다.

## 실행형 Phase

실행형 Phase는 `UXUI`, `BE`, `FE`, `Infra`, `QA`입니다.
각 Phase는 공통으로 아래 순서를 따릅니다.

1. 작업 계획 제시;
2. 사용자 승인;
3. 실행;
4. `docs/pipeline-state/...` 상태 파일 갱신;

## Review Gate

코드나 설정을 수정한 Phase는 모두 이 루프를 통과합니다.
이 루프를 관리하는 도구가 `Review` 스킬이며, 독립 Phase가 아니라 게이트 오케스트레이터입니다.

```text
[수정자]
    ↓ 변경 패킷 + State 갱신
[reviewer]
    ↓ FAIL
[이슈 ID 부여]
    ↓
[수정 계획]
    ↓ 사용자 승인
[수정 반영]
    ↓ State 갱신
[reviewer 재검토]
```

### Review Gate 규칙

- `reviewer FAIL`이면 다음 Phase로 이동 금지;
- 모든 리뷰 이슈는 안정적인 ID로 추적;
- 수정 반영은 새 작업으로 취급하며, 다시 계획과 승인을 거침;
- 닫히지 않은 리뷰 이슈가 하나라도 있으면 QA로 가지 않음;

## QA Gate

QA는 reviewer 다음의 두 번째 하드 게이트입니다.

- `PASS`: PM 최종 재검증으로 이동 가능;
- `FAIL`: 지정된 Phase부터 수정 후 QA 재실행;
- `RESTART`: 지정된 Phase부터 파이프라인 재시작;

### QA Gate 규칙

- `FAIL` 또는 `RESTART` 상태에서는 PM 최종 재검증 금지;
- QA 결과와 재시작 지점은 `Pipeline State`에 반드시 반영;
- QA는 reviewer PASS를 대체하지 않음;

## PM 최종 재검증

PM은 `Pipeline State`를 근거로 아래를 확인합니다.

- 원래 요청과 최종 결과의 일치 여부;
- 승인 범위 준수 여부;
- 열린 리뷰 이슈 존재 여부;
- QA PASS 여부;
- 기록 문서와 실제 변경의 정합성;

### PM 판정

- `PASS`: Record 단계로 진행;
- `RESTART`: 지정된 Phase부터 다시 시작;

## Record

PM 최종 `PASS` 이후에만 수행합니다.

1. `docs/history/` 기록 작성;
2. `docs/implementation-plan.md` 로그 업데이트;
3. 필요 시 운영 문서 동기화;

## Deploy와의 관계

`deploy`는 이 스킬의 대체제가 아닙니다.
배포는 `docs/pipeline-state/...` 상태 파일에 PM 최종 `PASS`가 기록된 뒤에만 실행할 수 있습니다.

## 최종 보고서 형식

```markdown
## 파이프라인 결과

### 활성 Phase
- ...

### 승인 이력
- Phase / 승인 여부 / 범위

### 리뷰 상태
- 열린 이슈 0개 / N개

### QA 상태
- PASS / FAIL / RESTART

### PM 최종 판정
- PASS / RESTART

### 상태 아티팩트
- `docs/pipeline-state/YYYY-MM-DD-NN-<topic>.md`
```

## 규칙

- 활성화되지 않은 Phase를 습관적으로 호출하지 않습니다;
- 승인되지 않은 계획을 자동 실행하지 않습니다;
- `reviewer`와 QA를 통과하지 않은 변경은 완료로 취급하지 않습니다;
- Jira는 사용하지 않습니다. 상태와 기록은 프로젝트 문서로 관리합니다;
