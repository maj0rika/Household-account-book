---
date: 2026-03-09
type: fix
---

# 웹 파비콘 충돌 정리

## 변경 내용

- `public/favicon.ico`를 제거해 `src/app/favicon.ico`만 `/favicon.ico`를 제공하도록 정리했다.
- App Router 메타데이터 아이콘 라우트와 `public/` 정적 파일이 동시에 존재해 발생하던 파비콘 충돌을 해소했다.

## 변경된 파일

- public/favicon.ico
- docs/history/2026-03-09-06-favicon-conflict-fix.md
- docs/implementation-plan.md

## 결정 사항

- `src/app/favicon.ico`는 실제 `.ico` 리소스이고, 기존 `public/favicon.ico`는 PNG 파일이어서 파비콘의 단일 소스로 유지할 가치가 더 낮았다.
- App Router를 사용하는 현재 구조에서는 `app` 쪽 아이콘 메타데이터를 기준으로 관리하는 편이 충돌 가능성이 적다.
