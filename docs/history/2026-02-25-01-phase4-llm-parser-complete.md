---
date: 2026-02-25
phase: 4
type: complete
---

# Phase 4: LLM 파서 구현 완료

## 변경 내용

### 구현 항목
- OpenAI SDK 설치 (`openai` 패키지)
- 파싱 결과 타입 정의 (`ParsedTransaction`, `ParseResponse`)
- 프롬프트 템플릿 작성 (시스템 프롬프트 + 카테고리 동적 삽입 + 한국어 금액/상대 날짜 규칙)
- LLM 클라이언트 팩토리 (환경변수 `LLM_PROVIDER`로 openai/kimi 전환)
- 통합 파싱 함수 (LLM 호출 → JSON 추출 → 유효성 검증 + 실패 시 1회 재시도)
- Server Action (`parseTransactionInput`) — 인증 확인 후 파싱 호출
- API Route (`POST /api/parse`) — Capacitor 앱 대응용 래핑
- `.env.example` LLM 관련 환경변수 설명 보강

### 설계 결정: YAGNI 적용
- 별도 `TransactionParser` 인터페이스 + OpenAI/KIMI 구현체 분리 **안 함** → 같은 OpenAI SDK이므로 팩토리 하나로 충분
- Redis 기반 Rate Limiting **안 함** → v1.0은 필요 시 메모리 기반으로
- 스트리밍 응답 **안 함** → 파싱 결과는 짧아서 불필요
- 프롬프트 캐싱 **안 함** → 비용 문제 생기면 추후 추가

## 애로사항 및 해결 과정

### 1. KIMI API baseURL 확인
- **문제**: 초기 설정에서 `https://api.moonshot.cn/v1` 사용 → `Invalid Authentication` 에러
- **원인**: moonshot.cn은 중국 내수용 엔드포인트. 국제 계정의 API 키는 `api.moonshot.ai`에서만 동작
- **시도**: `platform.moonshot.ai/v1` → 이것은 웹 프론트엔드(Next.js)로 404 반환
- **해결**: `https://api.moonshot.ai/v1`이 올바른 국제 API 엔드포인트. `/v1/models` 엔드포인트로 모델 목록 확인하여 검증

### 2. KIMI 계정 잔액 부족 (429)
- **문제**: API 키 인증은 통과했으나 `429 Your account is suspended due to insufficient balance` 에러
- **해결**: 사용자가 KIMI 플랫폼에서 잔액 충전 후 정상 동작 확인

### 3. kimi-k2.5 모델 temperature 제한
- **문제**: `temperature: 0.1` 설정 시 `400 invalid temperature: only 1 is allowed for this model` 에러
- **원인**: `kimi-k2.5` 모델은 temperature 값을 1만 허용 (모델 고유 제약)
- **해결**: `LLMConfig`에 `temperature` 필드를 추가하여 프로바이더별로 다르게 설정
  - openai: `temperature: 0.1` (낮은 창의성으로 일관된 파싱)
  - kimi: `temperature: 1` (모델 제약에 맞춤)

### 4. 사용 가능 모델명 확인
- **문제**: 초기 코드에서 `kimi-k2-0711` 모델명 사용 → 실제로는 다른 이름
- **해결**: `/v1/models` API로 실제 모델 목록 조회 → `kimi-k2.5` 확인. 기타 사용 가능 모델: `kimi-latest`, `kimi-k2-turbo-preview`, `kimi-k2-thinking` 등

## 검증 결과

### 기본 지출 파싱
```
입력: "점심 김치찌개 9000, 커피 4500"
결과: 식비 9,000원 + 카페/간식 4,500원 (오늘 날짜)
```

### 상대 날짜 + 수입 + 한국어 금액
```
입력: "어제 택시 1만5천, 월급 300만원"
결과: 교통 15,000원 (어제) + 급여 3,000,000원 (수입 자동 판단)
```

## 변경된 파일

| 파일 | 작업 |
|------|------|
| `package.json` | `openai` 의존성 추가 |
| `package-lock.json` | 자동 생성 |
| `.env.example` | LLM 환경변수 설명 보강 |
| `src/server/llm/types.ts` | 새로 생성 — 파싱 결과 타입 |
| `src/server/llm/prompt.ts` | 새로 생성 — 프롬프트 템플릿 |
| `src/server/llm/client.ts` | 새로 생성 — LLM 클라이언트 팩토리 |
| `src/server/llm/index.ts` | 새로 생성 — 통합 파싱 함수 |
| `src/server/actions/parse.ts` | 새로 생성 — Server Action |
| `src/app/api/parse/route.ts` | 새로 생성 — API Route |

## 다음 할 일
- Phase 5: 핵심 UI (모바일 퍼스트) — 레이아웃, 자연어 입력바, AI 파싱 결과 Bottom Sheet, 거래 목록
