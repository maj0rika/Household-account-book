## Pipeline State

### 요청 요약
- `src/server/actions/parse-unified.ts` dead code를 제거하고 파싱 진입점 문서를 단일 구조로 정리한다;

### 수용 기준
- [x] `src/server/actions/parse-unified.ts`가 삭제된다;
- [x] `src/` 기준 `parseUnifiedInput` / `parseUnifiedImageInput` 참조가 없다;
- [x] 문서와 히스토리 인덱스가 현재 파싱 구조를 반영한다;

### 활성 Phase
- PM;
- BE;
- REVIEW;
- QA;

### 스킵 Phase
- UXUI: 사용자 인터페이스 변경이 없다;
- FE: 클라이언트 컴포넌트 동작 변경이 없다;
- INFRA: 배포/환경설정 변경이 없다;
- DEPLOY: 사용자 요청이 없다;

### 승인 이력
- 2026-03-10 / PM 계획 / 승인됨 / `parse-unified.ts` dead code 제거;

### 변경 패킷
- BE / `src/server/actions/parse-unified.ts`, `docs/implementation-plan.md` / dead code 제거와 엔트리포인트 설명 정리;
- REVIEW / `rg -n "parseUnifiedInput|parseUnifiedImageInput" src docs`, `npx tsc --noEmit`, `npm run build` / PASS;

### 리뷰 이슈
- 열린 이슈 0개;

### QA 상태
- PASS;
- 재시작 지점: 없음;

### PM 최종 판정
- PASS;
- 근거: dead code 제거, 참조 검색, 타입체크, 빌드, 문서 반영이 모두 확인되었다;

### 다음 액션
- 과거 히스토리 문서의 당시 표현은 유지하되 현재 진입점 기준 문서는 계속 `/api/parse` 단일 구조를 따른다;
