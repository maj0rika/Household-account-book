# 코드 품질 가이드라인

> **프로젝트**: AI 자동 분류 가계부 앱
> **최종 수정일**: 2026-02-25
> **적용 범위**: BE, FE, Infra 전체. 예외 없음.

---

## 원칙

1. **일관성**: 기존 코드 패턴을 먼저 확인하고, 동일한 패턴으로 작성한다.
2. **명시성**: 타입, 반환값, 에러 처리를 명시적으로 선언한다.
3. **단순성**: 과도한 추상화 없이, 현재 필요한 만큼만 구현한다.
4. **검증 가능성**: 모든 변경은 `tsc --noEmit` + `npm run build`로 검증한다.

---

## BE 패턴 (Server Actions)

### 구조

```typescript
"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/server/db";
import { tableName } from "@/server/db/schema";
import { getAuthUserId } from "./helpers";

// 반환 타입 명시
export async function actionName(param: Type): Promise<ReturnType> {
    const userId = await getAuthUserId();

    const results = await db
        .select({ id: tableName.id })
        .from(tableName)
        .where(and(eq(tableName.userId, userId), eq(tableName.field, param)));

    return results;
}
```

### 규칙

| 규칙 | 이유 |
|------|------|
| `getAuthUserId()` 필수 호출 | 모든 데이터 접근은 인증 기반 |
| 반환 타입 명시 | 호출부에서 타입 추론 보장 |
| Drizzle Query Builder 사용 | raw SQL 최소화, 타입 안전성 |
| `{ success, error }` 에러 패턴 | 클라이언트에서 일관된 에러 처리 |
| `onConflictDoNothing()` 중복 방지 | 시드/배치 삽입 시 안전성 |

---

## FE 패턴 (Components)

### Import 순서

```typescript
// 1. React / Next.js
// 2. 외부 라이브러리 (lucide, recharts 등)
// 3. 내부 UI 컴포넌트 (@/components/ui/*)
// 4. 도메인 컴포넌트 / Server Actions
// 5. 유틸리티 / 포맷터
// 6. 타입 (type import)
```

### 컴포넌트 구조

```typescript
"use client";

interface Props {
    data: DataType[];
}

export function ComponentName({ data }: Props) {
    // 1. 빈 상태 early return
    if (data.length === 0) {
        return <EmptyState message="데이터가 없습니다" />;
    }

    // 2. 파생 데이터 계산
    const total = data.reduce((sum, d) => sum + d.amount, 0);

    // 3. 메인 렌더링
    return ( ... );
}
```

### 색상 규칙

| 용도 | 클래스 | 금지 |
|------|--------|------|
| 수입 금액 | `text-income` | ~~text-blue-600~~ |
| 지출 금액 | `text-expense` | ~~text-red-600~~ |
| 잔액 (양수) | `text-income` | ~~text-green-600~~ |
| 잔액 (음수) | `text-expense` | ~~text-red-600~~ |
| Primary UI | `text-primary`, `bg-primary` | ~~bg-black~~ |
| 차트 수입 | `var(--income)` | ~~hsl(var(--chart-2))~~ |
| 차트 지출 | `var(--expense)` | ~~hsl(var(--chart-1))~~ |

### UI 컴포넌트 규칙

- raw `<input>` → `<Input>` (shadcn/ui)
- raw `<button>` → `<Button>` (shadcn/ui)
- raw `<label>` → `<Label>` (shadcn/ui)
- raw div 카드 → `<Card>` (shadcn/ui)
- 인라인 스타일 → Tailwind 클래스

---

## 네이밍

| 대상 | 패턴 | 예시 |
|------|------|------|
| 컴포넌트 파일 | PascalCase.tsx | `MonthlySummaryCard.tsx` |
| Server Action 파일 | camelCase.ts | `transaction.ts` |
| 함수 | camelCase | `getMonthlySummary()` |
| 컴포넌트 | PascalCase | `TransactionList` |
| 상수 | SCREAMING_SNAKE | `DEFAULT_CATEGORIES` |
| CSS 변수 | kebab-case | `--primary` |
| boolean | is/has 접두어 | `isActive`, `hasData` |

---

## 금지 사항

- `any` 타입
- `var` 선언
- 하드코딩된 색상 (`text-red-500`, `#ff0000`)
- 프로덕션 `console.log`
- 미사용 import / 변수
- shadcn/ui 대체 가능한 raw HTML 요소

---

## 점검 체크리스트

### 매 작업 시

- [ ] 기존 동일 도메인 코드를 읽고 패턴 확인했는가?
- [ ] Import 순서가 규칙을 따르는가?
- [ ] 색상이 시맨틱 변수를 사용하는가?
- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run build` 통과

### Phase 완료 시

- [ ] 전체 파일 패턴 일관성 점검
- [ ] 미사용 코드 정리
- [ ] 디자인 시스템 위반 점검
- [ ] 200줄 초과 파일 분리 검토
- [ ] 3회 이상 중복 로직 추출 검토
