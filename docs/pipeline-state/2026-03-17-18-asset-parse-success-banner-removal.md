## Pipeline State

### 요청 요약
- 자산/부채 파싱 결과를 승인해 저장한 뒤 상단에 노출되는 성공 배너를 제거한다;

### 수용 기준
- [x] 자산/부채 파싱 저장 후 `/assets` 진입 시 상단 성공 배너가 노출되지 않는다;
- [x] 거래+자산 혼합 입력에서 자산 단계 저장 후 `/transactions` 진입 시 상단 성공 배너가 노출되지 않는다;
- [x] 기존 거래 저장(`saved=tx`) 배너 동작은 유지된다;

### 활성 Phase
- PM;
- FE;
- QA;

### 스킵 Phase
- UXUI: 기존 화면 구조 변경 없이 저장 후 후행 배너만 제거한다;
- BE: 서버 액션과 DB 스키마 변경이 없다;
- Infra: 빌드/배포 설정 변경이 없다;

### 승인 이력
- PM 계획 / 승인됨 / 범위: 자산 파싱 저장 후 성공 배너 제거;
- FE 계획 / 승인됨 / 범위: 자산 파싱 리다이렉트 쿼리 제거와 배너 계산 정리;
- QA 계획 / 승인됨 / 범위: 타입/린트와 자산 저장 후 배너 미노출 회귀 확인;

### 변경 패킷
- FE / `src/components/assets/AccountParseResultSheet.tsx`, `src/app/(dashboard)/assets/page.tsx`, `src/app/(dashboard)/transactions/page.tsx` / 자산 파싱 저장 후 성공 배너용 쿼리 제거, 자산 페이지 배너 제거, 거래 페이지는 `saved=tx`만 유지;
- FE 검증 / `npx tsc --noEmit`, `npm run lint`, `rg -n "saved=account|saved=mixed" src` / 모두 통과;

### 리뷰 이슈
- Reviewer / PASS / 열린 이슈 0개;

### QA 상태
- PASS;
- 재시작 지점: 없음;

### PM 최종 판정
- PASS;
- 근거: 자산 파싱 저장 후 성공 배너 제거가 적용됐고, reviewer 이슈 없이 타입/린트 검증을 통과했다;

### 다음 액션
- 없음;
