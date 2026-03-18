## 요청 요약

- GitHub Actions의 `Quality` 워크플로를 저장소에서 제거한다;
- 제거 사실을 상태 문서와 히스토리에 남기고 구현 계획서 로그를 갱신한다;
- 기존 워크트리의 미추적 문서는 이번 작업 범위에서 제외한다;

## 수용 기준

- `.github/workflows/quality.yml`이 저장소에서 제거된다;
- 변경 내용이 `docs/history/2026-03-18-32-remove-quality-action.md`에 기록된다;
- `docs/implementation-plan.md` 히스토리 로그에 이번 변경 링크가 추가된다;
- reviewer와 QA 기준에서 열린 이슈가 없다;

## 활성 Phase

- PM;
- Infra;
- reviewer;
- QA;
- PM;

## 스킵 Phase

- `uxui`: 화면 구조나 상호작용 변경이 아니다;
- `fe`: 앱 코드 변경이 아니다;
- `be`: 서버 기능 변경이 아니다;
- `deploy`: 배포 요청이 없다;

## 승인 이력

- 2026-03-18 사용자가 `fix(app): origin과 브라우저 호환성 정리` 관련 Quality 액션 제거를 요청했다;
- 2026-03-18 사용자가 `ㄱ`으로 PM 계획을 승인했다;

## 변경 패킷

- `.github/workflows/quality.yml`을 삭제해 `push(main)`와 `pull_request`에서 자동 실행되던 `Quality` 워크플로를 제거했다;
- `docs/pipeline-state/2026-03-18-32-remove-quality-action.md`를 추가해 승인, 변경, reviewer, QA, PM 판정을 기록했다;
- `docs/history/2026-03-18-32-remove-quality-action.md`를 추가해 제거 배경과 변경 파일을 남겼다;
- `docs/implementation-plan.md` 히스토리 로그에 이번 변경 링크를 추가했다;

## 리뷰 이슈

- PASS;
- 열린 이슈 없음;
- 삭제 범위가 `.github/workflows/quality.yml`과 기록 문서 갱신으로 제한돼 승인 범위를 넘는 설정 변경은 없다;

## QA 상태

- PASS;
- `find .github/workflows -maxdepth 1 -type f | sort`: 워크플로 파일 없음 확인;
- `git diff --check`: 공백/패치 포맷 이슈 없음;
- `sed -n '1,220p' docs/pipeline-state/2026-03-18-32-remove-quality-action.md`: 상태 파일 섹션과 판정 기록 확인;
- `sed -n '1,220p' docs/history/2026-03-18-32-remove-quality-action.md`: 히스토리 템플릿과 변경 이유 확인;
- `rg -n "GitHub Quality 액션 제거" docs/implementation-plan.md`: 히스토리 로그 링크 반영 확인;

## PM 최종 판정

- PASS;
- 요청 범위는 Quality 액션 제거와 기록 갱신으로 제한됐고, reviewer/QA 기준에서 추가 수정이 필요하지 않다;
- 커밋, 푸시, 배포는 사용자 별도 승인 전까지 진행하지 않는다;

## 다음 액션

- 필요하면 이후 별도 요청에서 다른 GitHub Actions 정리나 대체 CI 전략을 검토한다;
