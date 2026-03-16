## Pipeline State

### 요청 요약
- Fireworks 설정 존재 여부 체크 표현을 `hasFireworks()` 재사용 방식으로 정리한다;

### 수용 기준
- [x] `canUseFireworks()` 첫 줄이 `if (!hasFireworks()) return false;`로 정리된다;
- [x] 런타임 동작은 동일하게 유지된다;
- [x] 변경 사항이 `docs/history/`와 `docs/implementation-plan.md`에 기록된다;

### 활성 Phase
- PM;
- BE;
- REVIEW;
- QA;

### 스킵 Phase
- UXUI: 사용자 인터페이스 변경이 없다;
- FE: 클라이언트 컴포넌트, 페이지, 스타일 수정이 없다;
- INFRA: 환경변수 키 구조, 배포 설정, CI 변경이 없다;
- DEPLOY: 사용자 요청이 없다;

### 승인 이력
- 2026-03-10 / PM 계획 / 승인됨 / Fireworks 설정 체크 표현 정리;

### 변경 패킷
- BE / `src/server/services/parse-core.ts` / `canUseFireworks()`가 `hasFireworks()`를 재사용하도록 정리;
- REVIEW / `npx tsc --noEmit`, `npm run build` / PASS;

### 리뷰 이슈
- 열린 이슈 0개;

### QA 상태
- PASS;
- 재시작 지점: 없음;

### PM 최종 판정
- PASS;
- 근거: 승인 범위 내에서 표현만 정리했고 타입체크, 빌드, 기록 문서 반영이 모두 확인되었다;

### 다음 액션
- 이후 커밋 시 기존 미커밋 변경과 staging 범위를 분리한다;
