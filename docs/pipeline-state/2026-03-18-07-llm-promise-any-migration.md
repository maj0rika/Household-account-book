## 요청 요약

- `llm` 영역의 race 및 추가 로직을 `Promise.any` 기반 경쟁 제어로 마이그레이션한다;
- 우선 범위는 `src/server/services/parse-core.ts`와 관련 race 테스트로 제한한다;
- 목적은 수동 레이스 루프를 줄이고 첫 성공 응답 선택 로직을 표준 Promise 조합으로 단순화하는 것이다;

## 수용 기준

- 텍스트 provider race가 `Promise.any` 기반으로 동작한다;
- 패자 요청 abort, 실패 수집, 최종 실패 선택 로직이 기존 동작과 의미상 동일하게 유지된다;
- 변경 범위는 `llm` 서버 로직과 관련 테스트에 한정된다;
- 기존 동작인 텍스트 provider race, 이미지 fallback, 응답 정규화가 유지된다;
- 관련 변경이 `docs/history/`와 `docs/implementation-plan.md` 히스토리 로그에 기록된다;

## 활성 Phase

- PM;
- BE;
- Review;
- QA;

## 스킵 Phase

- UXUI: 화면 구조나 상호작용 변경이 없다;
- FE: 클라이언트 컴포넌트 수정이 없다;
- Infra: 환경변수, 배포, 빌드 설정 변경이 없다;
- Deploy: 배포 요청이 없다;

## 승인 이력

- 2026-03-18 사용자 승인으로 `llm race+추가 로직 Promise.any 마이그레이션` 작업 착수를 승인했다;

## 변경 패킷

- `src/server/services/parse-core.ts`
- `src/server/services/__tests__/text-race.test.ts`
- `docs/history/2026-03-18-08-llm-promise-any-migration.md`
- `docs/implementation-plan.md`
- `docs/pipeline-state/2026-03-18-07-llm-promise-any-migration.md`

### BE 변경 패킷

#### 목표

- 텍스트 provider race를 수동 루프 대신 `Promise.any` 기반으로 전환한다;
- 패자 abort와 최종 실패 선택 규칙은 유지한다;

#### 핵심 로직

- `raceTextProviders`에서 provider별 parse promise를 성공 resolve / 실패 reject 형태로 감싸 `Promise.any`에 연결했다;
- 승자 확정 뒤 나머지 controller를 abort하고 `Promise.allSettled`로 잔여 promise를 정리한다;
- 승자 확정 후 abort된 패자는 실패 로그에서 제외해 성공 케이스의 경고 노이즈를 막았다;
- race 테스트 헬퍼도 같은 패턴으로 바꿔 실제 구현과 검증 모델을 맞췄다;

#### 검증 결과

- `npm run lint -- --file src/server/services/parse-core.ts --file src/server/services/__tests__/text-race.test.ts`: PASS;
- `npm test -- src/server/services/__tests__/text-race.test.ts`: PASS;

#### 남은 리스크

- 실제 벤더 SDK 응답 지연/abort 타이밍 차이는 통합 환경에서만 완전히 확인할 수 있다;

## 리뷰 이슈

### Reviewer 결과

- PASS;
- 이슈 없음;
- 승자 확정 후 abort된 패자가 실패 경고로 남는 노이즈만 구현 중 보정했고, 추가 블로커는 확인되지 않았다;

## QA 상태

- PASS;

### QA 검증 결과

- 정적 분석: `npm run lint -- --file src/server/services/parse-core.ts --file src/server/services/__tests__/text-race.test.ts` 통과;
- 회귀 테스트: `npm test -- src/server/services/__tests__/text-race.test.ts` 통과;
- 수정 지점: 없음;

## PM 최종 판정

- PASS;
- 요청 범위는 `Promise.any` 기반 텍스트 race 전환으로 제한되었고, 변경 파일·리뷰·QA 근거가 상태 파일과 일치한다;

## 다음 액션

- 히스토리 문서와 구현 계획서 로그를 동기화한다;
