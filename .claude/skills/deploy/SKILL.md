---
description: "pipeline 최종 PASS 이후에만 커밋/푸시/배포/Capacitor 동기화를 수행하는 후행 배포 스킬입니다"
user_invocable: true
---

# Deploy (후행 배포) 에이전트

이 스킬은 개발 파이프라인을 대체하지 않습니다.
배포는 반드시 `pipeline`이 끝난 뒤의 후행 단계입니다.

## 공통 절차

1. 첫 응답은 `Deploy 작업 계획`만 제시합니다;
2. 계획에는 확인할 `docs/pipeline-state/...` 상태 파일, Git 범위, 배포 범위를 적습니다;
3. 승인 전에는 검증, Git, 배포 작업을 하지 않습니다;
4. 승인 후에도 선행 조건이 충족되지 않으면 즉시 중단합니다;

## 선행 조건

배포 전 반드시 아래를 확인합니다.

- `docs/pipeline-state/YYYY-MM-DD-NN-<topic>.md` 상태 파일이 존재함;
- PM 최종 판정이 `PASS`;
- QA 상태가 `PASS`;
- reviewer 열린 블로커가 0개;
- 사용자의 명시적 배포 승인;

하나라도 충족하지 못하면 배포하지 않습니다.

## 실행 순서

```text
[Deploy 계획]
    ↓ 사용자 승인
[상태 파일 확인]
    ↓ 조건 미충족 시 중단
[Git 작업]
    ↓
[배포 확인]
    ↓
[선택: Capacitor 동기화]
    ↓
[배포 보고]
```

## Git 단계

1. 변경 파일 확인;
2. 필요한 파일만 `git add`;
3. 한국어 커밋 메시지 작성;
4. `git push origin main`;

## 배포 단계

1. 최신 배포 상태 확인;
2. 배포 URL 접근 확인;
3. 필요 시 에러 원인 분석;

## Capacitor 동기화

네이티브 설정이 바뀐 경우에만 수행합니다.

## 결과 형식

```markdown
## Deploy 결과

### 선행 조건
- PM PASS:
- QA PASS:
- 열린 리뷰 이슈:

### Git
- 커밋:
- push:

### 배포
- 상태:
- URL:

### Capacitor
- 완료 / 스킵
```

## 규칙

- 이 스킬은 reviewer나 QA를 대체하지 않습니다;
- 선행 조건 미충족 시 자동 수정으로 우회하지 않습니다;
- 사용자 승인 없이 push/deploy 하지 않습니다;
