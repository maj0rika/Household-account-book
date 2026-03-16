# Pipeline State 저장 규약

이 디렉토리는 파이프라인 실행 상태 파일을 저장합니다.

## 파일명 규칙

- `YYYY-MM-DD-NN-<topic>.md`;
- 같은 날 여러 건이면 `NN`으로 순번을 올립니다;
- `<topic>`은 기능 또는 작업 단위를 kebab-case로 적습니다;

## 사용 규칙

- PM이 작업 시작 시 상태 파일을 생성합니다;
- 파이프라인 밖에서 `review`, `reviewer`, `qa`가 단독 호출되면 각 스킬이 최소 상태 파일을 생성합니다;
- `uxui`, `be`, `fe`, `infra`, `review`, `reviewer`, `qa`, `deploy`는 이 파일을 읽고 갱신합니다;
- 단독 실행용 파일명은 `YYYY-MM-DD-NN-review-<topic>.md`, `YYYY-MM-DD-NN-reviewer-<topic>.md`, `YYYY-MM-DD-NN-qa-<topic>.md` 패턴을 사용합니다;
- reviewer 이슈는 `REV-01`, `REV-02` 형식의 안정적인 ID를 유지합니다;
- PM 최종 `PASS` 전에는 상태 파일을 완료로 표시하지 않습니다;
- 필수 섹션은 `요청 요약`, `수용 기준`, `활성 Phase`, `스킵 Phase`, `승인 이력`, `변경 패킷`, `리뷰 이슈`, `QA 상태`, `PM 최종 판정`, `다음 액션`입니다;
