## Pipeline State

### 요청 요약
- 저장 완료 후 상단에 뜨는 배너를 전체 제거한다;

### 수용 기준
- [x] 거래 저장 후 `/transactions` 진입 시 상단 성공 배너가 노출되지 않는다;
- [x] 자산/부채 저장 후 `/assets` 또는 `/transactions` 진입 시 상단 성공 배너가 노출되지 않는다;
- [x] 저장 완료 배너용 쿼리 파라미터와 공용 배너 컴포넌트가 더 이상 사용되지 않는다;

### 활성 Phase
- PM;
- FE;
- QA;

### 스킵 Phase
- UXUI: 기존 저장 플로우와 화면 구조는 유지하고 후행 배너만 제거한다;
- BE: 서버 액션과 데이터 저장 로직 변경이 없다;
- Infra: 빌드/배포 설정 변경이 없다;

### 승인 이력
- PM 계획 / 승인됨 / 범위: 저장 완료 후 상단 배너 전체 제거;
- FE 계획 / 승인됨 / 범위: 거래 저장 쿼리 제거, 거래 페이지 배너 제거, 공용 배너 컴포넌트 정리;
- QA 계획 / 승인됨 / 범위: 타입/린트와 배너 관련 참조 제거 확인;

### 변경 패킷
- FE / `src/components/transaction/ParseResultSheet.tsx`, `src/app/(dashboard)/transactions/page.tsx`, `src/components/common/PostActionBanner.tsx` / 거래 저장 성공 쿼리 제거, 거래 페이지 배너 제거, 공용 배너 컴포넌트 삭제;
- FE 검증 / `rg -n "PostActionBanner|saved=tx|saved=account|saved=mixed|savedMessage|searchParams: Promise<\\{.*saved" src`, `npx tsc --noEmit`, `npm run lint` / 모두 통과;

### 리뷰 이슈
- Reviewer / PASS / 열린 이슈 0개;

### QA 상태
- PASS;
- 재시작 지점: 없음;

### PM 최종 판정
- PASS;
- 근거: 저장 완료 배너 경로와 공용 컴포넌트가 제거됐고, 타입/린트 검증과 참조 검색이 모두 통과했다;

### 다음 액션
- 없음;
