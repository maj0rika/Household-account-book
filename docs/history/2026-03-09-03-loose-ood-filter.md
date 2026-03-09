---
date: 2026-03-09
type: fix
---

# OOD 선필터 완화

## 변경 내용

- `src/server/llm/ood-filter.ts`를 수정해, 금액/은행/금융 단서가 있는 입력은 즉시 통과시키고 애매한 입력도 기본적으로 LLM 2차 필터로 넘기도록 완화했다.
- 선차단 대상은 날씨, 코딩 요청, 번역, 짧은 잡담처럼 명백한 비도메인 입력으로만 축소했다.
- OOD 안내 문구 예시를 환불/자산 입력까지 포함하도록 바꿨다.

## 변경된 파일

- src/server/llm/ood-filter.ts
- docs/history/2026-03-09-03-loose-ood-filter.md
- docs/implementation-plan.md

## 결정 사항

- false negative가 false positive보다 훨씬 치명적이므로, OOD 필터는 비용 최적화보다 정상 입력 통과를 우선한다.
- 선필터는 명백한 비도메인만 차단하고, 나머지 판별 책임은 LLM의 `rejected: true`와 사용자 확인 시트가 맡는다.

## 다음 할 일

- 실제 사용자 입력 로그에서 "짧지만 정상인 거래 문장" 사례를 모아 OOD false negative 회귀 케이스를 정리한다.
