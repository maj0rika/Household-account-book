# 1-2. Props와 핵심 Hooks

> Vue/Svelte 경험자가 이 프로젝트를 설명하기 위해 꼭 알아야 하는 React 최소 개념만 정리한다.;

## 이번 문서에서 가져갈 것

- `props`는 부모가 자식에게 데이터를 넘기는 읽기 전용 입력이다.;
- `useState`는 화면에 반영되는 상태;
- `useEffect`는 렌더 뒤 실행되는 부수효과;
- `useRef`는 리렌더 없이 값을 붙잡거나 DOM을 참조하는 용도;
- `useTransition`은 급하지 않은 갱신을 낮은 우선순위로 미루는 도구;

## Vue/Svelte와 1:1 대응

| React | Vue / Svelte 쪽 감각 | 이 프로젝트 예시 |
|---|---|---|
| `props` | `defineProps`, `export let` | `NaturalInputBar`에 `onParsed` 전달 |
| `useState` | `ref()`, `$state` | 입력값, 시트 열림 여부 |
| `useEffect` | `watch`, `onMount`, `$effect` | 시트가 닫힌 뒤 데이터 재동기화 |
| `useRef` | `ref`, `bind:this` | textarea, file input, 이전 open 상태 |
| `useTransition` | 즉시 반응 + 느린 갱신 분리 | 저장/수정 중 pending UI |

## 1. Props

React 컴포넌트는 함수이고, `props`는 함수 인자다.;

```tsx
interface NaturalInputBarProps {
	onParsed: (result: UnifiedParseResult, originalInput: string) => void;
}

export function NaturalInputBar({ onParsed }: NaturalInputBarProps) {
	// ...
}
```

이 프로젝트에서는 부모가 데이터 흐름을 잡고, 자식은 이벤트를 올려 보내는 패턴이 많다.;

- [UnifiedInputSection.tsx](/Users/leeth/Documents/git/Household account book/src/components/transaction/UnifiedInputSection.tsx): `NaturalInputBar`에 `onParsed` 전달;
- [ParseResultSheet.tsx](/Users/leeth/Documents/git/Household account book/src/components/transaction/ParseResultSheet.tsx): `items`, `categories`, `accounts`를 받아 편집 UI만 담당;

면접에서는 이렇게 말하면 된다.;

> "상위 컴포넌트가 데이터와 흐름을 가지고, 하위 컴포넌트는 props로 데이터를 받아 렌더링하거나 콜백을 올려보내는 구조입니다.";

## 2. `useState`

`useState`는 값이 바뀌면 다시 렌더링된다.;

```tsx
const [txSheetOpen, setTxSheetOpen] = useState(false);
const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
```

이 프로젝트에서 `useState`는 거의 다 UI 상태다.;

- 시트 열림/닫힘;
- 입력 텍스트;
- 에러 메시지;
- 이미지 프리뷰;

즉, Vue의 `ref`처럼 생각하면 되지만, **setter로 갱신해야 렌더 흐름이 명확해진다**는 점이 중요하다.;

## 3. `useEffect`

`useEffect`는 렌더 후 실행되는 부수효과다.;

이 레포에서 자주 보이는 패턴은 두 가지다.;

### 패턴 A. 마운트 후 초기화

```tsx
useEffect(() => {
	setDark(document.documentElement.classList.contains("dark"));
}, []);
```

### 패턴 B. 상태 변화에 따른 후처리

```tsx
useEffect(() => {
	if (prevTxOpen.current && !txSheetOpen) {
		void syncData();
	}
	prevTxOpen.current = txSheetOpen;
}, [txSheetOpen]);
```

이건 [UnifiedInputSection.tsx](/Users/leeth/Documents/git/Household account book/src/components/transaction/UnifiedInputSection.tsx)에서 실제로 쓰는 방식이다.  
거래 시트가 닫힌 뒤 카테고리와 계좌를 다시 읽어 와서, 다음 입력 때 최신 상태를 보장한다.;

면접에서는 이렇게 설명하면 된다.;

> "React에서는 렌더와 부수효과를 분리합니다. 이 프로젝트에서는 시트 종료 후 재조회, draft 복원, 타이머 정리 같은 후처리를 `useEffect`로 분리했습니다.";

## 4. `useRef`

`useRef`는 두 가지 용도가 있다.;

1. DOM 요소 참조;
2. 렌더와 무관한 가변 값 저장;

이 프로젝트에서는 둘 다 쓴다.;

```tsx
const textareaRef = useRef<HTMLTextAreaElement>(null);
const fileInputRef = useRef<HTMLInputElement>(null);
const prevTxOpen = useRef(txSheetOpen);
const requestAbortRef = useRef<AbortController | null>(null);
```

- DOM 참조: textarea 높이 조절, 파일 선택 열기;
- 가변 값: 이전 시트 상태, 현재 요청 취소 핸들, 타이머 ID;

핵심은 `useRef` 값이 바뀌어도 리렌더되지 않는다는 점이다.  
그래서 "화면에 보여줄 값"은 `useState`, "렌더와 무관한 작업용 값"은 `useRef`로 나누면 된다.;

## 5. `useTransition`

`useTransition`은 당장 입력 반응을 막지 않으면서, 조금 무거운 업데이트를 뒤로 미루는 도구다.;

```tsx
const [isPending, startTransition] = useTransition();

startTransition(async () => {
	const result = await createTransactions(items, originalInput);
	// ...
});
```

이 레포에서는 `useTransition`이 꽤 많이 보인다.;

- 저장/삭제/수정 버튼의 pending 상태;
- 월 전환;
- 파싱 결과 확정 저장;

Vue/Svelte에서 "사용자 클릭에는 즉시 반응하고, 네트워크 결과가 올 때까지 버튼만 pending 처리"하는 감각과 비슷하게 이해하면 된다.;

## 이 프로젝트에서 꼭 볼 파일

1. [UnifiedInputSection.tsx](/Users/leeth/Documents/git/Household account book/src/components/transaction/UnifiedInputSection.tsx);
2. [NaturalInputBar.tsx](/Users/leeth/Documents/git/Household account book/src/components/transaction/NaturalInputBar.tsx);
3. [ParseResultSheet.tsx](/Users/leeth/Documents/git/Household account book/src/components/transaction/ParseResultSheet.tsx);

## 이번 주에는 안 외워도 되는 것

- `useMemo` / `useCallback` 일반론;
- custom hook 설계 원칙;
- React memoization 세부 최적화;

면접 대비 기준으로는 `props`, `useState`, `useEffect`, `useRef`, `useTransition`만 정확히 설명하면 충분하다.;

## 30초 요약

> "이 프로젝트의 클라이언트 컴포넌트는 대부분 `props + useState + useEffect + useRef + useTransition` 조합입니다. 화면에 보이는 값은 state로, 렌더와 무관한 제어값은 ref로, 네트워크 후처리와 타이머는 effect로, 저장/전환 pending은 transition으로 분리했습니다.";
