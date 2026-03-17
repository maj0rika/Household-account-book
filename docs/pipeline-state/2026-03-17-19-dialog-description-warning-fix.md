## Pipeline State

### 요청 요약
- `DialogContent` 사용처에서 발생하는 `Missing Description or aria-describedby={undefined}` 경고를 제거한다;

### 수용 기준
- [ ] 브라우저 콘솔에서 해당 `DialogContent` 경고가 재현되지 않는다;
- [ ] 시각적으로 불필요한 설명 텍스트를 노출하지 않고 접근성 요구사항을 만족한다;
- [ ] 변경 사항이 `docs/history/`와 `docs/implementation-plan.md`에 기록된다;
- [ ] 파이프라인 상태 파일이 단계별 결과를 반영한다;

### 활성 Phase
- PM;
- FE;
- QA;
- PM 최종 재검증;

### 스킵 Phase
- UXUI: 새 사용자 흐름이나 레이아웃 변경이 아닌 접근성 경고 수정 범위다;
- BE: 서버 로직 변경이 없다;
- Infra: 빌드나 배포 설정 변경이 없다;
- Deploy: 요청 범위에 배포가 없다;

### 승인 이력
- PM 계획 / 승인됨 / 접근성 경고 제거와 파이프라인 착수;
- FE 계획 / 승인됨 / `CategoryManager`, `BudgetForm` 다이얼로그 설명 누락 보강;
- QA 계획 / 승인됨 / 타입, 빌드, 다이얼로그 사용처 정적 점검;

### 변경 패킷
- FE / `src/components/settings/CategoryManager.tsx`, `src/components/budget/BudgetForm.tsx` / `DialogDescription` 3건 추가 / `npx tsc --noEmit`, `npm run build` 통과;

### 리뷰 이슈
- 없음;

### QA 상태
- PASS;
- 재시작 지점: 없음;

### PM 최종 판정
- PASS;
- 근거: `DialogContent` 사용처 점검 결과 설명 누락이 남아 있지 않고 `npx tsc --noEmit`, `npm run build`가 모두 통과했다;

### 다음 액션
- 없음;
