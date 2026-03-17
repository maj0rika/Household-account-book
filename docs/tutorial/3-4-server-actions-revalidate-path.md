# 3-4. Server Actions + `revalidatePath`

> 이 레포를 React/Next답게 만드는 핵심 조합이다.;

## 한 문장 요약

Server Action은 "서버에서 실행되는 함수를 클라이언트에서 직접 호출하는 방식"이고, `revalidatePath`는 "그 결과로 오래된 페이지 캐시를 버리고 다시 그리게 하는 방식"이다.;

## 왜 API Route를 전부 만들지 않았나

이 프로젝트는 CRUD 대부분을 Server Action으로 처리한다.;

- 거래 저장/수정/삭제;
- 카테고리 추가/삭제;
- 계좌 생성/수정/삭제;
- 예산 수정;

이유는 단순하다.;

1. 타입이 바로 연결된다.;
2. 인증과 DB 접근이 서버 안에 남는다.;
3. 폼/버튼 이벤트에서 직접 호출하기 쉽다.;

## 실제 코드 구조

### 1. Server Action

[src/server/actions/transaction.ts](/Users/leeth/Documents/git/Household account book/src/server/actions/transaction.ts)는 `"use server"`로 시작한다.;

```tsx
"use server";

export async function createTransactions(items: ParsedTransaction[], originalInput: string) {
	// 서버에서 DB 저장
	revalidateTransactionPages();
}
```

### 2. 클라이언트에서 호출

[ParseResultSheet.tsx](/Users/leeth/Documents/git/Household account book/src/components/transaction/ParseResultSheet.tsx) 같은 클라이언트 컴포넌트에서 저장 액션을 호출한다.;

```tsx
const [isPending, startTransition] = useTransition();

startTransition(async () => {
	const result = await createTransactions(items, originalInput);
	// 저장 결과 처리
});
```

이 패턴 덕분에 별도 `fetch("/api/transactions")`를 만들지 않아도 된다.;

## 그럼 `/api/parse`는 왜 있나

파싱은 예외다.;

- 요청 취소가 필요하다.;
- 이미지 base64 payload를 보낸다.;
- `AbortController`와 HTTP status를 직접 다룬다.;

그래서 [NaturalInputBar.tsx](/Users/leeth/Documents/git/Household account book/src/components/transaction/NaturalInputBar.tsx)는 `fetch("/api/parse")`를 사용하고, 나머지 CRUD는 Server Action으로 간다.;

이 면접 포인트는 중요하다.;

> "모든 걸 한 방식으로 밀지 않고, 브라우저 제어가 필요한 파싱만 API Route로 두고 일반적인 데이터 변경은 Server Action으로 정리했습니다.";

## `revalidatePath`는 어디서 쓰나

직접 여기저기 흩뿌리지 않고 [cache-keys.ts](/Users/leeth/Documents/git/Household account book/src/lib/cache-keys.ts)로 모아뒀다.;

```ts
export function revalidateTransactionPages(): void {
	revalidatePath(CachePaths.transactions, "page");
	revalidatePath(CachePaths.statistics, "page");
	revalidatePath(CachePaths.assets, "page");
	revalidatePath(CachePaths.budget, "page");
}
```

즉, "거래가 바뀌면 어떤 화면들이 함께 낡는가"를 한 파일에 모아둔 구조다.;

이건 pxd 식으로 말하면 UI가 아니라 **데이터 영향 범위 설계**에 가깝다.;

## Nuxt/SvelteKit와 비교

| Next.js | Nuxt / SvelteKit 감각 |
|---|---|
| Server Action | server action / form action |
| `revalidatePath` | 서버 재조회 강제 + 페이지 재렌더 트리거 |
| API Route + fetch | 직접 HTTP 제어가 필요한 예외 경로 |

정확히 같은 개념은 아니지만, "서버에 있는 변경 로직을 브라우저가 안전하게 호출한다"는 감각으로 이해하면 된다.;

## 면접에서 자주 나오는 꼬리 질문

### Q. 왜 전역 상태를 거의 안 썼나

읽기는 서버에서 다시 하고, 쓰기는 Server Action 뒤 `revalidatePath`로 새로 그리기 때문이다.;

### Q. 왜 `revalidateTag` 안 썼나

현재 구조에서는 경로 단위 무효화만으로 충분했고, 태그 단위 캐시 관리까지 들어가면 복잡도만 늘어난다고 판단했다.;

### Q. 왜 `router.refresh()`보다 `revalidatePath`인가

사용자 액션이 끝난 뒤 어떤 화면이 함께 바뀌어야 하는지를 서버 기준으로 보장하기 더 쉽기 때문이다.;

## 30초 요약

> "이 프로젝트는 CRUD를 Server Action으로 묶고, 저장 후에는 `revalidatePath` 래퍼를 호출해 관련 화면을 다시 그립니다. 대신 파싱처럼 취소·이미지 업로드·HTTP 상태 제어가 필요한 경우에만 `/api/parse`를 별도로 뒀습니다.";
