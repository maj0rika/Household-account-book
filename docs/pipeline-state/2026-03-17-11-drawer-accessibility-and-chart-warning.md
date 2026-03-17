## Pipeline State

### 요청 요약

- 거래/대시보드 화면에서 발생하는 `Drawer/Dialog` 접근성 경고와 `Recharts` 크기 경고를 제거한다;

### 수용 기준

- [ ] `TransactionEditSheet`와 계정 시트 등 `DrawerContent` 사용부에서 `DialogContent` 설명 경고가 발생하지 않는다;
- [ ] 시트가 열릴 때 배경 영역이 `aria-hidden` 처리되기 전에 기존 포커스가 남아 발생하는 경고를 방지한다;
- [ ] 거래/대시보드 화면에서 `Recharts`가 `width(-1)`, `height(-1)` 경고를 내지 않도록 레이아웃 측정 조건을 정리한다;
- [ ] 변경 사항을 `docs/history/`와 `docs/implementation-plan.md`에 기록한다;

### 활성 Phase

- PM;
- FE;
- QA;

### 스킵 Phase

- UXUI: 새 화면 설계가 아니라 기존 상호작용과 접근성/레이아웃 경고 수정이다;
- BE: 서버 액션이나 데이터 계층 변경이 없다;
- Infra: 빌드 설정이나 배포 환경 변경이 없다;

### 승인 이력

- PM 계획 / 승인됨 / 접근성 경고와 차트 측정 경고를 함께 수정한다;
- FE 계획 / 승인됨 / `Drawer`, 거래 시트, 차트 섹션 레이아웃을 수정한다;
- Reviewer 검토 / 승인됨 / 변경 파일 정적 리뷰 결과 블로킹 이슈 없음;
- QA 계획 / 승인됨 / 관련 경고 재현 경로와 정적 검증을 확인한다;

### 변경 패킷

- FE / `src/components/ui/drawer.tsx`, `src/lib/accessibility.ts`, `src/components/transaction/TransactionEditSheet.tsx`, `src/components/assets/AccountFormSheet.tsx`, `src/components/transaction/TransactionList.tsx`, `src/components/dashboard/DayTransactionSheet.tsx`, `src/components/dashboard/WeeklyBarChart.tsx`, `src/components/dashboard/TransactionsLazySections.tsx` / `npx tsc --noEmit` 통과, `npm run lint` 통과;

### 리뷰 이슈

- 열린 이슈 0개;
- Reviewer / PASS / 공용 Drawer 포커스 정리, 설명 누락 보완, 차트 측정 경로 수정이 수용 기준과 일치한다;

### QA 상태

- PASS;
- `npx tsc --noEmit`: 통과;
- `npm run lint`: 통과;
- 시나리오 점검: 거래 항목 클릭, 일별 차트 바 클릭, 계정 시트 열기 경로에서 포커스 잔류와 설명 누락 경로를 코드상 제거했다;
- 재시작 지점: 없음;

### PM 최종 판정

- PASS;
- 근거: 활성 Phase 범위 안에서 접근성 경고와 차트 경고 원인을 수정했고, 리뷰/QA 게이트를 통과했다;

### 다음 액션

- `docs/history/` 기록과 `docs/implementation-plan.md` 히스토리 로그를 동기화한다;
