---
date: 2026-03-17
type: docs
---

# 추후 작업 backlog와 구현 현황 정리

## 변경 내용

- 추후 작업 후보를 `roadmap-v2` 문서에 backlog로 정리하고, 이미 구현된 항목과 확인이 필요한 항목을 구분했다;
- 고정거래 적용 방식은 현재 자동 적용과 수동 적용의 동작이 다르다는 점을 문서에 남겼다;
- 자산-거래 연동, AI race 전략 같은 기존 구현 항목은 중복 TODO를 만들지 않고 기존 기록을 참조하도록 정리했다;

## 변경된 파일

- docs/history/2026-03-17-22-future-work-backlog-alignment.md
- docs/pipeline-state/2026-03-17-22-future-work-backlog-alignment.md
- docs/roadmap-v2-todo-phase-plan.md
- docs/implementation-plan.md

## 결정 사항

- 추후 작업 메모는 새 산발 문서 대신 기존 backlog 문서인 `roadmap-v2`에 누적한다;
- 이미 완료된 항목은 새 TODO로 복제하지 않고 "구현 확인" 메모로만 남긴다;
- 고정거래는 자동 적용은 도래일 기준, 수동 적용은 월 일괄 적용이므로 후속 작업에서는 이 차이를 명시적으로 다룬다;

## 다음 할 일

- 고정거래 수정 기능과 도래일 기준 수동 적용 범위를 같은 묶음으로 설계 검토한다;
- 분석 AI와 운영 관측성(`Sentry`, provider별 latency/승률)을 우선순위에 따라 세부 Phase로 분리한다;
