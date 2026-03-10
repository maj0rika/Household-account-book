# Pipeline State Template

파이프라인 실행 중 승인 이력, 리뷰 상태, QA 결과를 추적하기 위한 공용 템플릿입니다.

## 저장 위치

- 실제 상태 파일 경로: `docs/pipeline-state/YYYY-MM-DD-NN-<topic>.md`;
- `topic`은 기능 또는 작업 단위를 kebab-case로 적습니다;
- 파이프라인 밖에서 `review`, `reviewer`, `qa`를 단독 수행할 때도 같은 디렉토리에 최소 상태 파일을 만듭니다;

```markdown
## Pipeline State

### 요청 요약
- ...

### 수용 기준
- [ ] ...

### 활성 Phase
- PM
- FE
- QA

### 스킵 Phase
- UXUI: 이유
- BE: 이유
- Infra: 이유

### 승인 이력
- PM 계획 / 승인됨 / 범위
- FE 계획 / 승인됨 / 범위
- QA 계획 / 대기 / 범위

### 변경 패킷
- FE / 파일 목록 / 검증 결과

### 리뷰 이슈
- REV-01 / BLOCKER / OPEN / 설명
- REV-02 / WARN / CLOSED / 설명

### QA 상태
- PASS / FAIL / RESTART
- 재시작 지점:

### PM 최종 판정
- PASS / RESTART
- 근거:

### 다음 액션
- ...
```

## 사용 규칙

- PM이 초기 버전을 만든다;
- 파이프라인 밖에서는 `review`, `reviewer`, `qa`가 최소 상태 파일을 먼저 만든다;
- 각 실행형 Phase가 자신의 결과를 누적 갱신한다;
- reviewer와 QA는 판정과 이슈 상태를 반드시 반영한다;
- 최종 PM은 이 문서를 근거로 PASS 또는 RESTART를 결정한다;
- 배포 전에는 Deploy가 이 파일을 다시 확인한다;
