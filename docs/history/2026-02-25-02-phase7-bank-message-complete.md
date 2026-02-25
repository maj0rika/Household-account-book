---
date: 2026-02-25
phase: 7
type: complete
---

# Phase 7: 메시지/은행 내역 연동 완료

## 변경 내용

### 1. LLM 프롬프트 확장 (prompt.ts)
- 은행/카드 알림 메시지 파싱 규칙(규칙 6번) 추가
- 주요 은행/카드사 메시지 예시 8종 포함 (카카오뱅크, 신한카드, KB국민, 삼성카드, 토스, 하나카드, 우리은행, 현대카드)
- 잔액/한도/누적/할부 등 노이즈 무시 지시
- 상호명에서 지점명 제거 규칙
- 쉼표 포함 금액("5,500원") 해석 규칙 추가
- 은행 메시지의 날짜 형식("02/25") 해석 규칙 추가
- 입금/출금/결제/승인 키워드로 수입/지출 판단 규칙 보강
- 편의점/마트/쿠팡 등 생활/마트 카테고리 매칭 추가

### 2. NaturalInputBar 멀티라인 모드 (NaturalInputBar.tsx)
- `Input` → `Textarea` 컴포넌트 변경
- **Enter**: 전송 / **Shift+Enter**: 줄바꿈 분기 로직
- 붙여넣기 감지: 여러 줄 텍스트 붙여넣기 시 자동으로 멀티라인 모드 전환
- 멀티라인 모드 전환 버튼 (MessageSquareText 아이콘)
- Textarea 높이 동적 조정 (최소 1줄 ~ 최대 6줄, max-height 160px)
- 멀티라인 모드에서 "Shift+Enter로 줄바꿈 · Enter로 전송" 안내 텍스트
- 플레이스홀더 동적 변경 (단일 → 멀티라인)

### 3. 은행 메시지 전처리 함수 (bank-message.ts)
- `isBankMessage()`: 은행/카드 알림 메시지 판별 (은행명/카드사명/키워드 매칭)
- `preprocessBankMessage()`: 노이즈 제거 전처리
  - 잔액/한도/누적/할부 정보 제거
  - 연속 공백/빈 줄 정리
- 주요 은행 11곳, 카드사 11곳 키워드 지원

### 4. Server Action 통합 (parse.ts)
- `isBankMessage()` 호출로 은행 메시지 자동 감지
- 은행 메시지인 경우 `preprocessBankMessage()` 전처리 후 LLM 파싱
- 일반 입력인 경우 기존 로직 유지 (변경 없음)

## 변경된 파일

| 파일 | 작업 |
|------|------|
| `src/server/llm/prompt.ts` | 수정 — 은행 메시지 파싱 규칙 추가 |
| `src/server/llm/bank-message.ts` | 신규 — 은행 메시지 전처리 함수 |
| `src/server/actions/parse.ts` | 수정 — 전처리 통합 |
| `src/components/transaction/NaturalInputBar.tsx` | 수정 — Textarea 멀티라인 |

## 설계 결정

### YAGNI 적용
- **시간(time) 필드 추가 안 함**: 은행 메시지에 시간 정보가 있지만, 현재 UI/DB에서 시간 단위 조회가 없으므로 불필요
- **별도 정규식 파서 안 만듦**: LLM이 이미 다양한 포맷을 잘 파싱하므로, 전처리는 노이즈 제거만 담당
- **입력 출처(source) 필드 안 추가**: 수동/은행 메시지 구분이 현재 비즈니스 로직에 영향 없음
- **중복 거래 감지 안 함**: v1.0에서는 사용자가 ParseResultSheet에서 직접 확인/삭제

### 전처리 vs 프롬프트 전략
- **전처리(bank-message.ts)**: 잔액/한도 등 확실한 노이즈만 정규식으로 제거
- **프롬프트(prompt.ts)**: 은행 메시지 포맷 인식, 카테고리 매칭, 금액/날짜 추출은 LLM에 위임
- **이유**: 은행마다 포맷이 다양하므로 정규식으로 모든 케이스를 커버하기보다 LLM의 유연한 이해력 활용

## 검증 결과

- TypeScript 컴파일: 에러 없음
- Next.js 빌드: 성공 (exit code 0)

## 다음 할 일
- Phase 8: 카테고리 + 설정 (카테고리 CRUD, 프로필 설정, 다크모드, 로그아웃)
