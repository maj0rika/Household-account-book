# MiniMax Fireworks Kimi Routing

## PM 분석 결과

### 기능 요약
- 100자 이하 짧은 텍스트를 `MiniMax -> Fireworks` 순서로 라우팅합니다;
- 긴 텍스트/복수 거래는 기존 Kimi 경로를 유지합니다;
- 이미지는 기존 정책을 유지해 `Fireworks 우선`, 3회 초과 시 `Kimi`로 전환합니다;
- MiniMax 응답의 `<think>` 블록이 JSON 파싱을 깨지 않도록 정규화합니다;

### 수용 기준
- [x] 짧은 텍스트 provider 순서가 `MiniMax -> Fireworks`로 반영됩니다;
- [x] 긴 텍스트 provider 경로가 Kimi 우선으로 유지됩니다;
- [x] 이미지 provider 순서가 기존 `Fireworks 3회 -> Kimi`로 유지됩니다;
- [x] Fireworks 사용량 차감이 이미지 경로에서만 발생합니다;
- [x] 변경 사항이 `docs/history/`와 `docs/implementation-plan.md`에 기록됩니다;

### 활성 Phase
- PM;
- BE;
- REVIEW;
- QA;

### 스킵 Phase
- UXUI: 사용자 인터페이스 변경이 없습니다;
- FE: 클라이언트 컴포넌트 변경이 없습니다;
- INFRA: 환경변수 구조 추가가 아니라 라우팅 정책 변경입니다;
- DEPLOY: 사용자 요청이 없습니다;

### 승인 체크포인트
- 사용자 승인 완료: 2026-03-10 `ㄱㄱ`;
- REVIEW: 타입/빌드 검증과 라우팅 diff 확인 후 진행;
- QA: REVIEW 열린 이슈가 없을 때만 PASS 가능;

### 재시작 기준
- 이미지 Fireworks 3회 규칙이 훼손되면 BE Phase부터 다시 수행합니다;
- MiniMax 응답 정규화가 누락되어 JSON 파서가 깨지면 BE Phase부터 다시 수행합니다;

### Pipeline State 초기값
- 파일 경로: `docs/pipeline-state/2026-03-10-21-minimax-fireworks-kimi-routing.md`;
- 요청 요약: MiniMax 텍스트 우선 라우팅과 이미지 Fireworks 정책 유지;
- 현재 상태: IN_PROGRESS;
- 열린 이슈: 0개;

## Phase 상태

| Phase | 상태 | 메모 |
| --- | --- | --- |
| PM | PASS | 최종 재검증 완료 |
| BE | PASS | MiniMax provider 추가, 텍스트/이미지 라우팅 분리, MiniMax `<think>` 정규화 반영 |
| REVIEW | PASS | build/tsc 통과, diff 범위와 라우팅 의도 확인 |
| QA | PASS | MiniMax/Fireworks 짧은 텍스트 실호출과 이미지 정책 보존 확인 |
| UXUI | SKIPPED | 변경 없음 |
| FE | SKIPPED | 변경 없음 |
| INFRA | SKIPPED | 새 키 슬롯 추가가 아닌 라우팅 정책 변경 |
| DEPLOY | SKIPPED | 사용자 미요청 |

## 승인 이력

- 2026-03-10: 사용자 승인 `ㄱㄱ`;

## 리뷰 이슈

- 없음;

## BE 변경 패킷

### 목표
- 짧은 텍스트는 `MiniMax -> Fireworks`로 보냅니다;
- 이미지는 기존 `Fireworks 3회 -> Kimi` 규칙을 유지합니다;
- MiniMax 응답의 reasoning 블록으로 JSON 파서가 깨지지 않게 합니다;

### 변경 파일
- `src/server/llm/client.ts`;
- `src/server/llm/index.ts`;
- `src/server/services/parse-core.ts`;
- `.env.example`;
- `docs/project-identity.md`;

### 핵심 로직
- `LLMProvider`에 `minimax`를 추가하고 OpenAI 호환 MiniMax 설정을 연결했습니다;
- `resolveTextProviders(input)`를 100자 기준으로 분기해 짧은 텍스트는 `minimax -> fireworks`, 긴 텍스트는 `kimi` 우선으로 유지했습니다;
- `resolveImageProviders(sessionId)`는 기존과 동일하게 Fireworks 사용량 3회와 Kimi 폴백을 유지했습니다;
- MiniMax 응답의 `<think>...</think>` 블록을 `extractJSON()` 이전에 제거하도록 정규화했습니다;
- Fireworks 사용량 차감과 쿨다운은 이미지 경로에만 적용되도록 분리했습니다;

### 검증 결과
- `npm run build`: PASS;
- `npx tsc --noEmit`: PASS;
- `git diff --check -- ...`: PASS;
- `parseUnifiedText(..., 'minimax')`: PASS;
- `parseUnifiedText(..., 'fireworks')`: PASS;

### 남은 리스크
- 짧은 텍스트의 실제 MiniMax 성공률과 Fireworks 폴백 비율은 운영 로그를 봐야 확정됩니다;
- 저장소에는 이번 작업 이전의 미커밋 변경이 이미 존재하므로, 이후 커밋 시 staging 범위를 분리해야 합니다;

## Review 결과

### 자동 검증
- `npm run build`: PASS;
- `npx tsc --noEmit`: PASS;
- `git diff --check -- src/server/llm/client.ts src/server/llm/index.ts src/server/services/parse-core.ts .env.example docs/project-identity.md docs/history/2026-03-10-21-minimax-fireworks-kimi-routing.md docs/implementation-plan.md docs/pipeline-state/2026-03-10-21-minimax-fireworks-kimi-routing.md`: PASS;

### 리뷰 이슈
- 없음;

### reviewer 판정
- PASS;

### Git
- 스킵;

## QA 검증 결과

### 검증 범위
- 짧은 텍스트 provider 순서가 `MiniMax -> Fireworks`인지;
- 긴 텍스트 provider 경로가 Kimi 우선으로 유지되는지;
- 이미지 provider 순서가 기존 `Fireworks 3회 -> Kimi`인지;
- MiniMax 응답 정규화가 실제 JSON 파싱을 통과하는지;

### 실행 결과
- 코드 확인: PASS;
- `npm run build`: PASS;
- `npx tsc --noEmit`: PASS;
- `parseUnifiedText('스타벅스 4500', ..., 'minimax')`: PASS;
- `parseUnifiedText('스타벅스 4500', ..., 'fireworks')`: PASS;

### 발견 이슈
- 없음;

### 재시작 또는 수정 지점
- 없음;

### 판정
- PASS;

## PM 최종 재검증

### State 요약
- 활성 Phase: PM, BE, REVIEW, QA;
- 승인 이력: 2026-03-10 사용자 승인 `ㄱㄱ`;
- 열린 리뷰 이슈: 0개;
- QA 상태: PASS;

### 비교 결과
- 요청 대비 구현: 일치;
- 승인 범위 준수: 예;
- 기록 문서 반영: 예;

### 남은 리스크
- 이미지 경로는 기존 정책을 유지했으므로, Fireworks 이미지 응답 품질 자체는 이번 변경 범위 밖입니다;

### 판정
- PASS;
