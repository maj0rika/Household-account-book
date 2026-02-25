---
description: "PM→BE→FE→Infra 순서로 전체 파이프라인을 실행하여 기능을 분석부터 구현, 검증까지 한 번에 수행합니다"
---

# Pipeline (올인원 파이프라인) 에이전트

이 스킬은 기능 요청을 받아 **4개 역할을 순차적으로 수행**합니다.

## 실행 순서

```
[사용자 요청]
    ↓
[Phase 1: PM] 요구사항 분석 → 작업 분해
    ↓
[Phase 2: BE] DB 스키마 + Server Action + API
    ↓
[Phase 3: FE] UI 컴포넌트 + 페이지 통합
    ↓
[Phase 4: Infra] 빌드 검증 + 보안 점검
    ↓
[최종 보고서]
```

## Phase 1: PM (분석)

**목표**: 요청을 구체적 작업으로 분해

1. 요청 사항을 명확한 기능 명세로 정리
2. `docs/implementation-plan.md`와 기존 코드를 참고하여 영향 범위 분석
3. 수용 기준(Acceptance Criteria) 정의
4. BE/FE/Infra 각각의 구체적 작업 목록 산출

**산출물**: 작업 분해표 (파일 단위)

> ⚠️ 이 단계에서 코드를 수정하지 않습니다. 분석만 합니다.
> 분석 결과를 사용자에게 보여주고, 승인 후 다음 Phase로 진행합니다.

---

## Phase 2: BE (백엔드 구현)

**목표**: 데이터 레이어와 비즈니스 로직 구현

1. DB 스키마 변경 필요 시: `src/server/db/schema.ts` 수정 → 마이그레이션
2. Server Action 생성/수정: `src/server/actions/`
3. API Route 필요 시: `src/app/api/`
4. 타입 정의: `src/types/index.ts` 업데이트

**검증**: `npx tsc --noEmit` 통과

---

## Phase 3: FE (프론트엔드 구현)

**목표**: UI 컴포넌트와 페이지 구현

1. 필요한 shadcn/ui 컴포넌트 설치 (`npx shadcn@latest add ...`)
2. 컴포넌트 구현: `src/components/`
3. 페이지 통합: `src/app/`
4. 모바일 퍼스트 반응형 확인

**검증**: `npx tsc --noEmit` 통과

---

## Phase 4: Infra (검증 및 마무리)

**목표**: 전체 빌드 성공 + 보안 점검

1. `npm run build` 성공 확인
2. `npm test` 통과 확인
3. 환경변수 변경 시 `.env.example` 동기화
4. 보안 점검 (시크릿 노출, 타입 안전성)

**검증**: 빌드 성공 + 테스트 통과

---

## 최종 보고서

모든 Phase 완료 후 다음 형식으로 보고합니다:

```markdown
## 🚀 파이프라인 실행 완료

### 요청 요약
(한 줄)

### PM 분석
- 기능 명세: ...
- 영향 범위: ...

### BE 구현
| 파일 | 작업 | 설명 |
|------|------|------|

### FE 구현
| 파일 | 작업 | 설명 |
|------|------|------|

### Infra 검증
- 빌드: ✅/❌
- 테스트: ✅/❌
- 보안: ✅/❌

### 확인 방법
1. ...
2. ...
```

## 규칙

- Jira를 사용하지 않습니다. 모든 관리는 프로젝트 내에서 합니다.
- Phase 1(PM 분석) 결과를 사용자에게 보여준 뒤, **사용자 승인을 받고** Phase 2로 진행합니다.
- 각 Phase에서 문제가 발생하면 즉시 사용자에게 보고하고 판단을 구합니다.
- `docs/implementation-plan.md`의 Phase 체크리스트를 업데이트합니다.
- 변경 사항이 큰 경우 `docs/history/`에 기록을 남깁니다.
