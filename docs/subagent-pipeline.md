# Sub-agent Delivery Pipeline (Conditional Phases + Review + QA Gates)

이 문서는 가계부 프로젝트 변경 작업의 기본 운영 절차입니다.

## 단계

1. **PM 계획**
   - 요청을 분석해 활성 Phase와 스킵 Phase를 결정한다;
   - `docs/pipeline-state/YYYY-MM-DD-NN-<topic>.md` 상태 파일을 초기화한다;
2. **활성 Phase 실행**
   - UXUI/BE/FE/Infra/QA 중 필요한 Phase만 실행한다;
   - 모든 실행형 Phase는 계획 제시 후 승인받아야 한다;
   - 각 Phase는 실행 전 상태 파일을 읽고, 실행 후 상태 파일을 갱신한다;
3. **Reviewer Gate**
   - `Review`는 독립 Phase가 아니라 이 게이트를 관리하는 오케스트레이터다;
   - 코드/설정 변경이 있으면 `reviewer PASS` 전까지 다음 단계로 못 간다;
   - 리뷰 이슈는 안정적인 ID로 관리한다;
4. **QA Gate**
   - QA가 `PASS`가 아니면 PM 최종 재검증으로 못 간다;
   - `FAIL`은 수정 후 재검증, `RESTART`는 상위 Phase부터 재시작이다;
5. **PM 최종 재검증**
   - 활성 Phase 실행 결과, 승인 범위, 열린 이슈, QA 상태를 최종 확인한다;
6. **Record**
   - 최종 `PASS` 후 `docs/history/`와 `docs/implementation-plan.md`를 갱신한다;
7. **Deploy**
   - 선택 단계이며, 상태 파일에 PM 최종 `PASS`가 있을 때만 실행한다;

## 운영 규칙

- 명시적 승인 없이는 어떤 Phase도 실행하지 않는다;
- 활성화되지 않은 Phase는 자동 호출하지 않는다;
- reviewer FAIL 상태에서는 절대 다음 단계로 이동하지 않는다;
- QA FAIL/RESTART 상태에서는 PM 최종 재검증으로 이동하지 않는다;
- 커밋/푸시는 별도 승인 없이 하지 않는다;
- 파이프라인 밖에서 `review`, `reviewer`, `qa`를 단독 실행하면 각 스킬이 `docs/pipeline-state/`에 최소 상태 파일을 먼저 만든다;
