## Pipeline State

### 요청 요약
- 짧은 텍스트를 `MiniMax -> Fireworks` 순서로 라우팅하고 이미지 경로는 기존 Fireworks 우선 정책을 유지한다;

### 수용 기준
- [x] 짧은 텍스트 provider 순서가 `MiniMax -> Fireworks`로 반영된다;
- [x] 긴 텍스트 provider 경로가 Kimi 우선으로 유지된다;
- [x] 이미지 provider 순서가 기존 `Fireworks 3회 -> Kimi`로 유지된다;
- [x] Fireworks 사용량 차감이 이미지 경로에서만 발생한다;
- [x] 변경 사항이 `docs/history/`와 `docs/implementation-plan.md`에 기록된다;

### 활성 Phase
- PM;
- BE;
- REVIEW;
- QA;

### 스킵 Phase
- UXUI: 사용자 인터페이스 변경이 없다;
- FE: 클라이언트 컴포넌트 변경이 없다;
- INFRA: 새 키 슬롯 추가가 아닌 라우팅 정책 변경이다;
- DEPLOY: 사용자 요청이 없다;

### 승인 이력
- 2026-03-10 / PM 계획 / 승인됨 / MiniMax 텍스트 우선 라우팅과 이미지 정책 유지;

### 변경 패킷
- BE / `src/server/llm/client.ts`, `src/server/llm/index.ts`, `src/server/services/parse-core.ts`, `.env.example`, `docs/project-identity.md` / provider 추가와 텍스트·이미지 라우팅 분리;
- REVIEW / `npm run build`, `npx tsc --noEmit`, `git diff --check -- ...` / PASS;

### 리뷰 이슈
- 열린 이슈 0개;

### QA 상태
- PASS;
- 재시작 지점: 없음;

### PM 최종 판정
- PASS;
- 근거: 라우팅 의도와 이미지 정책 보존, 타입체크, 빌드, 기록 문서 반영이 모두 확인되었다;

### 다음 액션
- 운영 로그에서 MiniMax 성공률과 Fireworks 폴백 비율을 추후 확인한다;
