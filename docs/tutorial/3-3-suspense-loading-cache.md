# 3-3. Suspense + `loading.tsx` + `cache()`

> 이 레포에서 Next.js스럽게 보이는 부분은 대부분 여기서 나온다.;

## 먼저 잡을 개념 3개

1. `Suspense`: 아직 준비되지 않은 UI 대신 fallback을 보여준다.;
2. `loading.tsx`: 특정 라우트 구간의 기본 로딩 UI다.;
3. `cache()`: 같은 요청 안에서 같은 async 호출을 중복 실행하지 않도록 묶는다.;

## 이 프로젝트에서 실제로 어떻게 쓰는가

[src/app/(dashboard)/transactions/page.tsx](/Users/leeth/Documents/git/Household account book/src/app/(dashboard)/transactions/page.tsx)를 보면, 섹션마다 `Suspense`를 걸어 둔다.;

```tsx
<Suspense fallback={<SummaryFallback />}>
	<TransactionsSummarySection month={month} />
</Suspense>
```

즉, 월 네비게이터, 요약 카드, 캘린더, 인사이트 섹션이 각각 독립적으로 준비된다.;

이 방식의 장점은 한 섹션이 느려도 전체 화면이 멈추지 않는다는 점이다.;

## `loading.tsx`는 어디에 쓰나

- [src/app/(dashboard)/transactions/loading.tsx](/Users/leeth/Documents/git/Household account book/src/app/(dashboard)/transactions/loading.tsx);
- [src/app/(dashboard)/assets/loading.tsx](/Users/leeth/Documents/git/Household account book/src/app/(dashboard)/assets/loading.tsx);
- [src/app/(dashboard)/statistics/loading.tsx](/Users/leeth/Documents/git/Household account book/src/app/(dashboard)/statistics/loading.tsx);

라우트가 처음 열릴 때는 `loading.tsx`가 먼저 보이고, 페이지 안쪽에서는 추가로 `Suspense fallback`을 세밀하게 나눈다.;

면접에서는 이렇게 말하면 된다.;

> "`loading.tsx`는 라우트 단위 기본 로딩이고, 페이지 내부 `Suspense`는 섹션 단위 로딩입니다. 그래서 첫 진입과 내부 섹션 지연을 따로 제어할 수 있습니다.";

## `cache()`는 왜 쓰나

[src/app/(dashboard)/transactions/page.tsx](/Users/leeth/Documents/git/Household account book/src/app/(dashboard)/transactions/page.tsx)에는 이런 코드가 있다.;

```tsx
const getTransactionsCached = cache(async (month: string) => getTransactions(month));
const getUserCategoriesCached = cache(async () => getUserCategories());
const getAccountsCached = cache(async () => getAccounts());
```

같은 요청 안에서 여러 섹션이 같은 데이터를 필요로 해도, 중복 호출을 줄이기 위한 장치다.;

예를 들어 거래 목록과 캘린더가 모두 거래 데이터를 쓰더라도, 요청 하나 안에서 동일 인자를 가진 호출을 재사용할 수 있다.;

## 왜 pxd 면접에서 중요한가

pxd는 "구현 전에 구조를 먼저 본다"는 표현을 자주 쓴다.  
이 부분은 그 말을 기술적으로 보여주기 좋다.;

- 한 페이지를 한 번에 불러오지 않고 섹션 단위로 쪼갰다.;
- 로딩 상태도 한 덩어리로 처리하지 않고 역할별로 분리했다.;
- 같은 데이터를 여러 번 읽지 않도록 `cache()`를 적용했다.;

즉, 화면을 그리는 방법 자체가 구조적 결정이다.;

## Nuxt/SvelteKit와 비교

| Next.js | Nuxt / SvelteKit 감각 |
|---|---|
| `loading.tsx` | route-level pending UI |
| `Suspense fallback` | 컴포넌트 단위 pending UI |
| `cache()` | 같은 요청 안의 중복 데이터 패칭 억제 |

완전히 같은 기능은 아니지만, "페이지가 준비될 때까지 기다리는 상태를 어디서 나눌 것인가"라는 문제를 해결하는 도구로 보면 된다.;

## 이번 주에는 여기까지만

- React `use()` 세부 동작;
- `revalidateTag`;
- PPR;

이런 건 이번 면접 준비 범위에서 제외한다.;

## 30초 요약

> "이 프로젝트는 `loading.tsx`로 라우트 기본 로딩을 만들고, `Suspense`로 섹션별 로딩을 쪼개고, `cache()`로 같은 요청의 중복 조회를 줄입니다. 그래서 거래 화면이 한 번에 멎는 대신, 준비된 영역부터 순서대로 보이게 설계했습니다.";
