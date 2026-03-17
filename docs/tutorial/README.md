# React & Next.js 튜토리얼

> Vue/Svelte/Nuxt/SvelteKit 경험자를 위한, 실제 프로젝트 기반 학습 자료;

## 1주 면접 압축 범위

이번 면접 준비에서는 React/Next 전체를 다 보지 않는다.  
아래 4개만 먼저 읽고, 바로 프로젝트 코드와 연결해서 설명할 수 있으면 된다.;

| 우선순위 | 주제 | 문서 | 바로 연결할 코드 |
|---|---|---|---|
| 1 | JSX / Props / 핵심 Hooks | [1-2 Props/Hooks](./1-2-props-hooks.md) | `UnifiedInputSection`, `NaturalInputBar`, `ParseResultSheet` |
| 2 | Server Component vs Client Component | [3-2 Server/Client Components](./3-2-server-client-components.md) | `src/app/(dashboard)/layout.tsx`, `src/app/(dashboard)/transactions/page.tsx` |
| 3 | Suspense + `loading.tsx` + `cache()` | [3-3 Suspense/Loading/Cache](./3-3-suspense-loading-cache.md) | `src/app/(dashboard)/transactions/page.tsx`, `src/app/(dashboard)/transactions/loading.tsx` |
| 4 | Server Actions + `revalidatePath` | [3-4 Server Actions](./3-4-server-actions-revalidate-path.md) | `src/server/actions/*.ts`, `src/lib/cache-keys.ts` |

## 이번 주에 일부러 안 보는 것

- Redux/Zustand 심화;
- Pages Router;
- `getServerSideProps`, `getStaticProps`;
- class component;
- `useMemo` / `useCallback` 일반론 암기;

이 레포에서 실제로 많이 쓰는 것은 `useEffect`, `useRef`, `useTransition`, `Suspense`, `Server Actions`, `revalidatePath`다.;

## 코드 읽기 진입점 5개

1. [page.tsx](/Users/leeth/Documents/git/Household account book/src/app/page.tsx);
2. [layout.tsx](/Users/leeth/Documents/git/Household account book/src/app/(dashboard)/layout.tsx);
3. [page.tsx](/Users/leeth/Documents/git/Household account book/src/app/(dashboard)/transactions/page.tsx);
4. [parse-core.ts](/Users/leeth/Documents/git/Household account book/src/server/services/parse-core.ts);
5. [schema.ts](/Users/leeth/Documents/git/Household account book/src/server/db/schema.ts);

설명 순서는 항상 고정한다.;

```text
화면 구조
→ 입력 이벤트
→ /api/parse
→ parse-core
→ server/llm
→ 결과 시트
→ Server Action 저장
→ revalidatePath
```

## 전체 목차

### Phase 1: React 기초

| # | 주제 | 파일 | Vue/Svelte 대응 |
|---|---|---|---|
| [1-1](./1-1-jsx.md) | JSX 문법 | 작성 완료 | `<template>` → JSX |
| [1-2](./1-2-props-hooks.md) | Props + 핵심 Hooks | 작성 완료 | `props`, `ref()`, `watch`, `onMount`, `bind:this` |
| 1-3 | useState 심화 | 후순위 | `ref()`, `$state` |
| 1-4 | useEffect 심화 | 후순위 | `watch`, `onMount`, `$effect` |
| 1-5 | 이벤트 핸들링 | 후순위 | `@click`, `on:click` |
| 1-6 | 조건부 & 리스트 렌더링 | 후순위 | `v-if`, `{#if}`, `v-for`, `{#each}` |

### Phase 2: React 심화

| # | 주제 | 파일 | Vue/Svelte 대응 |
|---|---|---|---|
| 2-1 | useRef & DOM 접근 | 압축본에 포함됨 | `ref`, `bind:this` |
| 2-2 | useMemo & useCallback | 이번 주 제외 | `computed`, `$derived` |
| 2-3 | Context API | 참고만 | `provide/inject` |
| 2-4 | 커스텀 훅 | 후순위 | composables |
| 2-5 | React.memo & 리렌더링 | 후순위 | Vue 자동 추적 |
| 2-6 | 에러 바운더리 | 후순위 | `onErrorCaptured` |

### Phase 3: Next.js 기초

| # | 주제 | 파일 | Nuxt/SvelteKit 대응 |
|---|---|---|---|
| 3-1 | App Router & 파일 기반 라우팅 | 후순위 | `pages/`, `+page.svelte` |
| [3-2](./3-2-server-client-components.md) | Server vs Client Components | 작성 완료 | 서버 로드 + 클라이언트 인터랙션 분리 |
| [3-3](./3-3-suspense-loading-cache.md) | Suspense + `loading.tsx` + `cache()` | 작성 완료 | `load()` + pending UI |
| [3-4](./3-4-server-actions-revalidate-path.md) | Server Actions + `revalidatePath` | 작성 완료 | `+page.server.ts` actions |
| 3-5 | 미들웨어 & 인증 | 후순위 | `server/middleware`, hooks |
| 3-6 | 동적 라우트 & 메타데이터 | 후순위 | `[slug].vue`, `+page.ts` |

### Phase 4: 실전 생태계

| # | 주제 | 파일 |
|---|---|---|
| 4-1 | Tailwind CSS 4 + shadcn/ui | 후순위 |
| 4-2 | Drizzle ORM + Supabase | 후순위 |
| 4-3 | Better Auth | 후순위 |
| 4-4 | 상태 관리 패턴 | 이번 주 제외 |
| 4-5 | 성능 최적화 | 후순위 |
| 4-6 | 배포 & Capacitor | 후순위 |
