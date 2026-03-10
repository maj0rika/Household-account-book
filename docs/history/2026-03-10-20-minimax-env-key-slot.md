---
date: 2026-03-10
type: config
---

# MiniMax API 키 환경변수 슬롯 추가

## 변경 내용

- 실제 환경 파일 `.env`에 `MINIMAX_API_KEY` 빈 값을 추가했다.
- 예시 파일 `.env.example`에 `MINIMAX_API_KEY` 항목과 설명을 추가했다.
- 환경 안내 문서에 `MINIMAX_API_KEY`를 예약 키로 명시했다.

## 변경된 파일

- .env
- .env.example
- docs/project-identity.md
- docs/history/2026-03-10-20-minimax-env-key-slot.md
- docs/implementation-plan.md

## 결정 사항

- 현재 런타임 provider는 MiniMax를 사용하지 않으므로, `MINIMAX_API_KEY`는 기능 활성화가 아닌 향후 연동을 위한 예약 슬롯으로만 추가한다.
- 기존 KIMI/Fireworks 설정 흐름은 변경하지 않는다.
