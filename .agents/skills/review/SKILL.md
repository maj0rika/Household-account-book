---
description: "reviewer 루프와 Git 단계를 관리하며, 리뷰 이슈를 안정적인 ID로 추적합니다"
user_invocable: true
---

# Review (리뷰 오케스트레이터) 에이전트

이 스킬은 reviewer와 수정자 사이의 루프를 관리하고, 필요할 때만 Git 단계를 수행합니다.
파이프라인 안에서는 독립 실행 Phase가 아니라 변경 Phase 사이의 게이트 오케스트레이터로 동작합니다.

## 공통 절차

1. 첫 응답은 `Review 작업 계획`만 제시합니다;
2. 계획에는 검증 명령, reviewer 범위, Git 수행 여부를 적습니다;
3. 승인 전에는 검증, reviewer 호출, Git 작업을 하지 않습니다;
4. 승인 후 자동 검증과 reviewer 루프를 시작합니다;
5. 리뷰 상태는 `docs/pipeline-state/...` 상태 파일에 누적합니다;

파이프라인 외부에서 단독 호출되면 `docs/pipeline-state/YYYY-MM-DD-NN-review-<topic>.md`에 템플릿 기반 최소 상태 파일을 먼저 만듭니다.

## 자동 검증

- `npx tsc --noEmit`;
- `npm run build`;
- 필요 시 테스트 명령;

검증 실패도 리뷰 이슈로 취급합니다.

## reviewer 연동 규칙

- reviewer는 이슈를 `REV-01`, `REV-02` 같은 안정적인 ID로 남깁니다;
- 수정자는 이슈를 바로 반영하지 말고 `수정 계획`을 다시 제시합니다;
- 재검토 시 같은 ID를 유지하며 `OPEN`/`CLOSED` 상태를 갱신합니다;
- 열린 블로커가 하나라도 있으면 다음 Phase로 못 갑니다;
- 모든 리뷰 결과는 상태 파일에 먼저 반영한 뒤 사용자에게 보고합니다;

## Git 단계

이 단계는 선택 사항입니다.
사용자가 리뷰만 요청했다면 스킵하고, 커밋/푸시는 별도 승인 후에만 수행합니다.

1. 변경 파일 확인;
2. 필요한 파일만 `git add`;
3. 한국어 커밋 메시지 작성;
4. `git push`;

## 결과 형식

```markdown
## Review 결과

### 자동 검증
- tsc:
- build:
- test:

### 리뷰 이슈
- REV-01 / BLOCKER / OPEN / 설명
- REV-02 / WARN / CLOSED / 설명

### reviewer 판정
- PASS / FAIL

### Git
- 승인 대기 / 완료 / 스킵
```

## 규칙

- 블로커가 남아 있으면 절대 커밋하지 않습니다;
- `git add .`를 사용하지 않습니다;
- 사용자 승인 없이 push 하지 않습니다;
