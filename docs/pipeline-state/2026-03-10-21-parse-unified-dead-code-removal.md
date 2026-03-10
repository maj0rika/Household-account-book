# Parse Unified Dead Code Removal

## PM 분석 결과

### 기능 요약
- `src/server/actions/parse-unified.ts`를 미사용 dead code로 삭제합니다;
- 파싱 진입점 문서를 `/api/parse` 단일 경로 기준으로 정리합니다;
- `parse-core.ts` 기반 텍스트/이미지 파싱 동작은 유지합니다;

### 수용 기준
- [x] `src/server/actions/parse-unified.ts`가 삭제됩니다;
- [x] `src/` 기준 `parseUnifiedInput` / `parseUnifiedImageInput` 참조가 없어야 합니다;
- [x] 문서와 히스토리 인덱스가 현재 파싱 구조를 반영합니다;

### 활성 Phase
- PM;
- BE;
- REVIEW;
- QA;

### 스킵 Phase
- UXUI: 사용자 인터페이스 변경이 없습니다;
- FE: 클라이언트 컴포넌트 동작 변경이 없습니다;
- INFRA: 배포/환경설정 변경이 없습니다;
- DEPLOY: 사용자 요청이 없습니다;

### 승인 체크포인트
- 사용자 승인 완료: 2026-03-10 `응`;
- REVIEW: 삭제 후 참조와 문서 불일치 여부를 확인합니다;
- QA: REVIEW 열린 이슈가 없을 때만 PASS 가능합니다;

### 재시작 기준
- 삭제 후 런타임 참조가 발견되면 BE Phase부터 다시 수행합니다;
- 문서가 현재 코드와 어긋나면 REVIEW Phase부터 다시 수행합니다;

### Pipeline State 초기값
- 파일 경로: `docs/pipeline-state/2026-03-10-21-parse-unified-dead-code-removal.md`;
- 요청 요약: `parse-unified.ts` dead code 제거;
- 현재 상태: IN_PROGRESS;
- 열린 이슈: 0개;

## Phase 상태

| Phase | 상태 | 메모 |
| --- | --- | --- |
| PM | PASS | dead code 판정과 범위 확정 완료 |
| BE | PASS | `parse-unified.ts` 삭제 및 파싱 구조 문서 정리 완료 |
| REVIEW | PASS | 참조 검색과 타입/빌드 검증 통과 |
| QA | PASS | 삭제 후 경로와 문서 일치 확인 |
| UXUI | SKIPPED | 변경 없음 |
| FE | SKIPPED | 변경 없음 |
| INFRA | SKIPPED | 변경 없음 |
| DEPLOY | SKIPPED | 사용자 미요청 |

## 승인 이력

- 2026-03-10: 사용자 승인 `응`;

## 리뷰 이슈

- 없음;

## BE 변경 패킷

### 목표
- 사용되지 않는 `parse-unified.ts`를 제거합니다;
- 파싱 엔트리포인트 설명을 `/api/parse` 단일 구조에 맞춥니다;

### 변경 파일
- `src/server/actions/parse-unified.ts`;
- `docs/implementation-plan.md`;
- `docs/history/2026-03-10-21-parse-unified-dead-code-removal.md`;
- `docs/pipeline-state/2026-03-10-21-parse-unified-dead-code-removal.md`;

### 핵심 로직
- `NaturalInputBar`가 이미 `/api/parse`만 호출하므로 미사용 Server Action 파일을 삭제합니다;
- 구현 계획 문서의 파싱 엔트리포인트 설명을 `/api/parse` 단일 진입점 기준으로 맞춥니다;

### 검증 결과
- `rg -n "parseUnifiedInput|parseUnifiedImageInput" src docs`: PASS;
- `npx tsc --noEmit`: PASS;
- `npm run build`: PASS;

### 남은 리스크
- 워크트리에 이번 작업 이전의 미커밋 변경이 이미 있으므로, 이후 커밋 시 staging 범위를 분리해야 합니다;

## Review 결과

### 자동 검증
- `rg -n "parseUnifiedInput|parseUnifiedImageInput" src docs`: PASS;
- `npx tsc --noEmit`: PASS;
- `npm run build`: PASS;

### 리뷰 이슈
- 없음;

### reviewer 판정
- PASS;

### Git
- 스킵;

## QA 검증 결과

### 검증 범위
- dead code 파일 삭제 여부;
- 코드와 문서의 파싱 진입점 설명 일치 여부;
- 타입체크/빌드 회귀 여부;

### 실행 결과
- 파일 삭제 확인: PASS;
- 참조 검색 확인: PASS;
- 타입체크/빌드 확인: PASS;

### 발견 이슈
- 없음;

### 재시작 또는 수정 지점
- 없음;

### 판정
- PASS;

## PM 최종 재검증

### State 요약
- 활성 Phase: PM, BE, REVIEW, QA;
- 승인 이력: 2026-03-10 사용자 승인 `응`;
- 열린 리뷰 이슈: 0개;
- QA 상태: PASS;

### 비교 결과
- 요청 대비 구현: 일치;
- 승인 범위 준수: 예;
- 기록 문서 반영: 예;

### 남은 리스크
- 과거 히스토리 문서는 당시 상태를 기록한 문서이므로 `parse-unified.ts` 언급이 남아 있습니다;

### 판정
- PASS;
