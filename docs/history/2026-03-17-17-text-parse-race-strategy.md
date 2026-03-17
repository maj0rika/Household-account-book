---
date: 2026-03-17
type: perf
---

# 텍스트 파싱 전략을 순차 폴백에서 동시 경쟁(first-success-wins)으로 전환

## 변경 내용

- 텍스트 파싱 시 사용 가능한 모든 LLM provider(Kimi, Fireworks, MiniMax)를 **동시에** 호출
- 가장 먼저 성공 응답을 반환한 provider가 승자가 되고, 나머지는 AbortController로 즉시 취소
- 기존의 입력 길이(100자) 기반 provider 선택 + 순차 폴백 로직 제거
- 빠른 실패(네트워크/인증 오류)는 무시하고 다른 provider 결과를 계속 대기
- 모든 provider 실패 시 콘텐츠 에러(LLM이 응답했으나 부적합)를 인프라 에러보다 우선 반환
- `parseUnifiedText`에 외부 AbortSignal 전달 지원 추가 (`options.signal`)
- `withTimeout`이 외부 signal과 내부 timeout signal을 합성하도록 확장
- 이미지 파싱 경로는 변경 없음 (기존 순차 폴백 유지)

## 변경된 파일

- `src/server/services/parse-core.ts` — `resolveTextProviders`, `executeTextParse`, `raceTextProviders`, `pickBestFailure` 추가/수정
- `src/server/llm/index.ts` — `withTimeout` 외부 signal 지원, `parseUnifiedText` signal 옵션 추가
- `src/server/services/__tests__/text-race.test.ts` — 동시 경쟁 패턴 유닛 테스트 8건 신규

## 결정 사항

- **동시 호출이 비용을 늘리지만 latency를 크게 줄인다**: 사용자 체감 응답 시간이 최악의 경우 수십 초에서 가장 빠른 provider의 응답 시간으로 개선
- **Promise.race 대신 수동 레이스**: unhandled rejection 방지, 패자 abort 제어, 에러 수집을 한 곳에서 관리
- **입력 길이 기반 provider 선택 제거**: 모든 provider가 동시에 경쟁하므로 길이별 라우팅이 불필요
- **AbortController 개별 부여**: 승자 결정 시 패자만 정밀하게 취소 (HTTP 요청 자체 중단)
- **sessionId 파라미터 유지**: 공개 API 시그니처 안정성을 위해 사용하지 않더라도 제거하지 않음
- **이미지는 순차 유지**: 세션별 사용량 추적/쿨다운 정책이 동시 경쟁과 호환되지 않음

## 다음 할 일

- 프로덕션 모니터링: 동시 호출로 인한 API 비용 증가 추이 관찰
- provider별 성공률/latency 메트릭 수집 고려
