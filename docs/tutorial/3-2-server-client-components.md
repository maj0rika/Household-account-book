# 3-2. Server Component vs Client Component

> Next.js App Router를 설명할 때 가장 먼저 잡아야 하는 경계다.;

## 한 문장 요약

- Server Component: 서버에서 실행되고, 데이터를 읽고, HTML을 만들어 보낸다.;
- Client Component: 브라우저에서 실행되고, 클릭/입력/애니메이션을 담당한다.;

Vue/Nuxt 감각으로 비유하면, 서버에서 데이터와 레이아웃을 준비하고 브라우저에는 인터랙션 조각만 내려보내는 구조에 가깝다.;

## 이 프로젝트의 실제 경계

### Server Component 예시

- [src/app/page.tsx](/Users/leeth/Documents/git/Household account book/src/app/page.tsx);
- [src/app/(dashboard)/layout.tsx](/Users/leeth/Documents/git/Household account book/src/app/(dashboard)/layout.tsx);
- [src/app/(dashboard)/transactions/page.tsx](/Users/leeth/Documents/git/Household account book/src/app/(dashboard)/transactions/page.tsx);

이 파일들은 `"use client"`가 없고, 서버에서 세션 확인이나 DB 조회를 수행한다.;

```tsx
export default async function TransactionsPage({ searchParams }: Props) {
	const params = await searchParams;
	const month = isValidMonth(rawMonth) ? rawMonth : getCurrentMonth();
	// 서버에서 데이터 준비
	return <div className="pb-28 md:pb-24">...</div>;
}
```

### Client Component 예시

- [NaturalInputBar.tsx](/Users/leeth/Documents/git/Household account book/src/components/transaction/NaturalInputBar.tsx);
- [ParseResultSheet.tsx](/Users/leeth/Documents/git/Household account book/src/components/transaction/ParseResultSheet.tsx);
- [BottomTabBar.tsx](/Users/leeth/Documents/git/Household account book/src/components/layout/BottomTabBar.tsx);
- [ThemeToggle.tsx](/Users/leeth/Documents/git/Household account book/src/components/settings/ThemeToggle.tsx);

이 파일들은 `"use client"`로 시작하고, `useState`, `useEffect`, `onClick`, `fetch()`를 사용한다.;

## 무엇이 어디에 가야 하나

| 작업 | 어디에 두는가 | 이 레포 예시 |
|---|---|---|
| 세션 확인 | Server Component / Server Action | `src/app/page.tsx`, `src/app/(dashboard)/layout.tsx` |
| DB 조회 | Server Component / Server Action | `transactions/page.tsx`, `server/actions/*.ts` |
| 버튼 클릭 | Client Component | `BottomTabBar`, `ParseResultSheet` |
| 입력 상태 | Client Component | `NaturalInputBar` |
| 브라우저 API | Client Component | `localStorage`, `FileReader`, `document` |

## 왜 이렇게 나눴나

이 프로젝트는 전역 상태 라이브러리 없이도 페이지가 돌아간다.  
이유는 **읽기 로직을 서버에 두고, 브라우저는 입력/편집 인터랙션만 담당**하기 때문이다.;

예를 들어 [src/app/(dashboard)/layout.tsx](/Users/leeth/Documents/git/Household account book/src/app/(dashboard)/layout.tsx)에서 세션을 확인하고 초기 카테고리/계좌를 미리 읽는다.;

```tsx
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) {
	redirect("/login");
}

const [initialCategories, initialAccounts] = await Promise.all([
	getUserCategories(),
	getAccounts(),
]);
```

그리고 그 결과를 `UnifiedInputSection`에 props로 넘긴다.  
즉, 화면의 출발점은 서버고, 브라우저는 그 위에서 수정/저장 경험만 만든다.;

## 면접 답변용 문장

> "이 프로젝트는 기본을 Server Component로 두고, 상호작용이 필요한 부분만 Client Component로 내렸습니다. 세션 확인과 초기 데이터 준비는 서버에서 처리하고, 자연어 입력, 시트 편집, 탭 인터랙션 같은 브라우저 작업만 클라이언트로 분리했습니다.";

## 자주 받는 꼬리 질문

### Q. Server Component에서 못 하는 것은

- `useState`, `useEffect`;
- `onClick`, `onChange`;
- `window`, `document`, `localStorage`;

### Q. Client Component에서 DB를 바로 읽지 않는 이유

브라우저에 DB 자격 증명을 둘 수 없고, 사용자별 권한 검증도 서버에서 해야 하기 때문이다.;

### Q. 왜 전체를 Client로 안 했나

그러면 초기 데이터 패칭과 캐싱, 인증 가드, 갱신 로직을 브라우저가 모두 떠안는다.  
이 프로젝트는 `Server Component + Server Action` 조합이 더 단순하다.;

## 꼭 연결해서 볼 코드

1. [src/app/(dashboard)/layout.tsx](/Users/leeth/Documents/git/Household account book/src/app/(dashboard)/layout.tsx);
2. [src/app/(dashboard)/transactions/page.tsx](/Users/leeth/Documents/git/Household account book/src/app/(dashboard)/transactions/page.tsx);
3. [src/components/transaction/UnifiedInputSection.tsx](/Users/leeth/Documents/git/Household account book/src/components/transaction/UnifiedInputSection.tsx);

## 30초 요약

> "Next.js App Router에서는 기본이 Server Component입니다. 이 프로젝트도 서버에서 세션과 데이터를 준비하고, 클라이언트는 입력과 편집만 맡습니다. 그래서 전역 상태가 거의 필요 없고, 화면 갱신도 Server Action 뒤 `revalidatePath`로 해결합니다.";
