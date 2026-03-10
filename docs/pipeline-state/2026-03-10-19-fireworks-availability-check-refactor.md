# Fireworks Availability Check Refactor

## PM 분석 결과

### 기능 요약
- `canUseFireworks()` 내부의 Fireworks 설정 존재 여부 체크를 `hasFireworks()` 재사용으로 치환합니다;
- provider 우선순위, 쿨다운, 사용량 정책은 변경하지 않습니다;

### 수용 기준
- [x] `canUseFireworks()` 첫 줄이 `if (!hasFireworks()) return false;`로 정리됩니다;
- [x] 런타임 동작은 동일하게 유지됩니다;
- [x] 변경 사항이 `docs/history/`와 `docs/implementation-plan.md`에 기록됩니다;

### 활성 Phase
- PM;
- BE;
- REVIEW;
- QA;

### 스킵 Phase
- UXUI: 사용자 인터페이스 변경이 없습니다;
- FE: 클라이언트 컴포넌트, 페이지, 스타일 수정이 없습니다;
- INFRA: 환경변수 키 구조, 배포 설정, CI 변경이 없습니다;
- DEPLOY: 사용자 요청이 없습니다;

### 승인 체크포인트
- 사용자 승인 완료: 2026-03-10 `수정 진행`;
- REVIEW: 타입/빌드 검증과 diff 범위 확인 후 진행;
- QA: REVIEW 열린 이슈가 없을 때만 PASS 가능;

### 재시작 기준
- 설정 체크 외 정책 변경이 섞이면 BE Phase부터 다시 수행합니다;
- 정적 검증 실패 시 REVIEW Phase부터 다시 수행합니다;

### Pipeline State 초기값
- 파일 경로: `docs/pipeline-state/2026-03-10-19-fireworks-availability-check-refactor.md`;
- 요청 요약: Fireworks 설정 체크 표현 중복 축소;
- 현재 상태: IN_PROGRESS;
- 열린 이슈: 0개;

## Phase 상태

| Phase | 상태 | 메모 |
| --- | --- | --- |
| PM | PASS | 최종 재검증 완료 |
| BE | PASS | `canUseFireworks()` 설정 체크를 `hasFireworks()` 재사용으로 정리 |
| REVIEW | PASS | build/tsc 통과, 승인 범위 내 변경 확인 |
| QA | PASS | 설정 체크 리팩터와 기록 문서 반영 확인 |
| UXUI | SKIPPED | 변경 없음 |
| FE | SKIPPED | 변경 없음 |
| INFRA | SKIPPED | 변경 없음 |
| DEPLOY | SKIPPED | 사용자 미요청 |

## 승인 이력

- 2026-03-10: 사용자 승인 `수정 진행`;

## 리뷰 이슈

- 없음;

## BE 변경 패킷

### 목표
- Fireworks 설정 존재 여부 체크 표현을 `hasFireworks()`로 통일합니다;

### 변경 파일
- `src/server/services/parse-core.ts`;

### 핵심 로직
- `canUseFireworks()` 시작 조건이 `process.env.FIREWORKS_API_KEY` 직접 참조 대신 `hasFireworks()` 호출을 사용합니다;
- provider 선택 정책, 쿨다운, 사용량 로직은 그대로 유지됩니다;

### 검증 결과
- `npx tsc --noEmit`: PASS (`npm run build`로 `.next/types` 생성 후 재실행);
- `npm run build`: PASS;
- 기타: 문서 반영 PASS;

### 남은 리스크
- 없음;

## Review 결과

### 자동 검증
- `npx tsc --noEmit`: PASS (`.next/types` 누락으로 초기 1회 실패 후 `npm run build` 실행 뒤 재검증 통과);
- `npm run build`: PASS;
- diff 범위 검토: PASS;

### 리뷰 이슈
- 없음;

### reviewer 판정
- PASS;

### Git
- 스킵;

## QA 검증 결과

### 검증 범위
- `canUseFireworks()` 설정 체크 표현 정리 여부;
- Fireworks provider 정책 불변 여부;
- 기록 문서 반영 여부;

### 실행 결과
- 코드 확인: PASS;
- `npx tsc --noEmit`: PASS;
- `npm run build`: PASS;

### 발견 이슈
- 없음;

### 재시작 또는 수정 지점
- 없음;

### 판정
- PASS;

## PM 최종 재검증

### State 요약
- 활성 Phase: PM, BE, REVIEW, QA;
- 승인 이력: 2026-03-10 사용자 승인 `수정 진행`;
- 열린 리뷰 이슈: 0개;
- QA 상태: PASS;

### 비교 결과
- 요청 대비 구현: 일치;
- 승인 범위 준수: 예;
- 기록 문서 반영: 예;

### 남은 리스크
- `src/server/services/parse-core.ts`에는 이번 작업 이전의 미커밋 변경도 함께 존재하므로, 이후 커밋 시 staging 범위를 분리해야 합니다;

### 판정
- PASS;
