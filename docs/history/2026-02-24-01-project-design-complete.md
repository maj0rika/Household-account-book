---
date: 2026-02-24
phase: 0
type: complete
---

# 프로젝트 설계 완료

## 변경 내용

- 브레인스토밍을 통해 전체 앱 설계 확정
- 기술 스택 선정 완료
- DB 스키마, 디렉토리 구조, UX 플로우, 배포 전략 정의

## 핵심 결정 사항

### 앱 정체성

- **자연어 입력 → AI 자동 분류** 가계부 (일반 폼 입력 가계부 아님)
- 완전 개인용 (공유 기능 없음)
- 커플/가족이 각자 독립적으로 사용

### 기술 스택

- Next.js 15 + TypeScript + Tailwind CSS 4 + shadcn/ui
- Supabase PostgreSQL + Drizzle ORM
- Better Auth (인증)
- KIMI 2.5 (프로덕션) / Fireworks AI (개발 및 대체)
- Capacitor 6 (iOS/Android 네이티브 앱)
- Vercel (웹 배포)

### UX/UI 방향

- 모바일 퍼스트 반응형
- 프리미엄 디자인: Glassmorphism, Mesh Gradient, Framer Motion 애니메이션
- 하단 고정 자연어 입력바 → AI 파싱 → Bottom Sheet 확인 → 저장

### 설계 변경 이력

1. "공유 가계부" → "개인 가계부"로 변경 (households/household_members 테이블 삭제)
2. 일반 폼 입력 → AI 자연어 파싱 중심으로 전환
3. 웹 전용 → Capacitor로 iOS/Android 앱 배포 추가
4. 모바일 퍼스트 반응형 UI 전략 확정
5. 프리미엄 UX/UI 디자인 시스템 추가 (Glassmorphism, 애니메이션 등)

## 생성된 문서

- `docs/brainstorms/2026-02-24-household-account-book-brainstorm.md` — 전체 설계 문서
- `docs/implementation-plan.md` — 구현 계획서 + 히스토리 관리

## 다음 할 일

- Phase 1: 프로젝트 초기화 (Next.js + Tailwind + shadcn/ui + Git)
