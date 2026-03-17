# 1-1. JSX 문법

> Svelte는 `.svelte` 파일에 HTML을 직접 쓴다. React는 **JS 함수 안에 HTML(JSX)을 리턴**한다.

---

## 핵심 차이: 컴포넌트 파일 구조

### Svelte 4 — HTML이 주인공, JS가 `<script>` 안에

```svelte
<script>
  let message = "안녕";
</script>

<div class="box">{message}</div>

<style>
  .box { color: red; }
</style>
```

- `<script>` + HTML + `<style>` 세 영역이 분리
- HTML이 파일의 메인 영역

### Vue — `<template>` 안에 HTML

```vue
<template>
  <div class="box">{{ message }}</div>
</template>
<script setup>
const message = ref("안녕");
</script>
```

### React (JSX) — JS가 주인공, HTML이 return 안에

```tsx
const MyComponent = () => {
    const message = "안녕";
    return <div className="box">{message}</div>;
};
```

- **파일 전체가 JS/TS**. 별도의 `<script>`, `<template>` 블록이 없다
- 컴포넌트 = **JSX를 리턴하는 함수**
- `return` 안에 쓰는 HTML-like 문법이 JSX

### 왜 이렇게 다른가?

Svelte/Vue는 **"HTML을 확장하자"** (디렉티브, 특수 문법 추가)
React는 **"JS 안에서 다 하자"** (HTML도 JS 표현식의 일부)

이 철학 차이가 아래 모든 규칙의 근본 원인이다.

---

## JSX 규칙 5가지

### 규칙 1. `class` → `className`, `for` → `htmlFor`

JSX는 JavaScript이다. JS 예약어와 충돌하는 HTML 속성 이름이 바뀐다.

```svelte
<!-- Svelte: 평범한 HTML -->
<div class="container">
<label for="email">이메일</label>
```

```tsx
// React: JS 예약어 회피
<div className="container">
<label htmlFor="email">이메일</label>
```

| HTML | JSX | 이유 |
|------|-----|------|
| `class` | `className` | `class`는 JS 클래스 선언 키워드 |
| `for` | `htmlFor` | `for`는 JS 반복문 키워드 |

**Svelte/Vue에서는 신경 쓸 필요 없었던 것**. React로 오면 처음에 자주 틀리는 부분이다.

### 규칙 2. 반드시 하나의 루트 요소 (Fragment)

```svelte
<!-- Svelte: 여러 루트 요소 OK -->
<h1>제목</h1>
<p>내용</p>
```

```tsx
// React: ❌ 컴파일 에러
return (
    <h1>제목</h1>
    <p>내용</p>
);

// React: ✅ Fragment로 감싸기
return (
    <>
        <h1>제목</h1>
        <p>내용</p>
    </>
);
```

- `<>...</>`는 `<React.Fragment>`의 축약형
- DOM에 불필요한 `<div>`를 추가하지 않는다
- **Svelte는 자유롭게 여러 루트를 쓸 수 있지만, React는 항상 하나로 감싸야 한다**

### 규칙 3. JS 표현식은 `{}` 안에

```svelte
<!-- Svelte -->
<p>{name}님 안녕하세요</p>
<p>가격: {price.toLocaleString()}원</p>
```

```tsx
// React — 동일한 단일 중괄호!
<p>{name}님 안녕하세요</p>
<p>가격: {price.toLocaleString()}원</p>
```

Svelte와 **문법이 동일**하다. `{}` 안에 JS 표현식을 넣는다.
(Vue만 `{{ }}` 이중 중괄호를 쓴다)

**주의**: `{}` 안에는 **표현식(expression)**만 가능. `if`문, `for`문 같은 **문(statement)**은 불가.

```tsx
// ❌ if문은 표현식이 아니다
<div>{if (ok) "yes"}</div>

// ✅ 삼항 연산자는 표현식이다
<div>{ok ? "yes" : "no"}</div>
```

Svelte에서도 `{}` 안에 `if`문을 못 쓰는 건 마찬가지다. 다만 Svelte는 `{#if}`라는 **블록 문법**을 별도로 제공하지만, React는 그런 게 없다.

### 규칙 4. 조건부 렌더링 — `{#if}` 블록 없음

이게 Svelte에서 오면 **가장 어색한 부분**이다.

```svelte
<!-- Svelte 4: 블록 문법으로 조건부 렌더링 -->
{#if isLoggedIn}
  <Dashboard />
{:else}
  <LoginForm />
{/if}

<!-- 단순 조건 -->
{#if error}
  <ErrorMessage text={error} />
{/if}

<!-- 다중 조건 -->
{#if loading}
  <Skeleton />
{:else if error}
  <Error />
{:else}
  <Data />
{/if}
```

```tsx
// React: 순수 JS 표현식으로 처리 — 블록 문법이 없다

// 패턴 A: 삼항 연산자 — {#if}{:else} 대응
{isLoggedIn ? <Dashboard /> : <LoginForm />}

// 패턴 B: && 연산자 — {#if}만 있을 때
{error && <ErrorMessage text={error} />}

// 패턴 C: 즉시실행함수 — {#if}{:else if}{:else} 대응
{(() => {
    if (loading) return <Skeleton />;
    if (error) return <Error />;
    return <Data />;
})()}

// 패턴 D: early return — 가장 React다운 방식 (컴포넌트 최상위에서)
if (loading) return <Skeleton />;
if (error) return <Error />;
return <Data />;
```

**솔직한 비교**: Svelte의 `{#if}` 블록이 훨씬 읽기 쉽다. React의 삼항/&&는 간단한 조건에는 깔끔하지만, 조건이 복잡해지면 가독성이 떨어진다. 그래서 React에서는 **early return 패턴**을 적극적으로 쓴다.

### 규칙 5. 리스트 렌더링 — `{#each}` 블록 없음

```svelte
<!-- Svelte 4: {#each} 블록 -->
{#each items as item (item.id)}
  <li>{item.name}</li>
{/each}
```

```tsx
// React: .map() 메서드 + key prop
{items.map((item) => (
    <li key={item.id}>{item.name}</li>
))}
```

**차이점 정리:**

| | Svelte `{#each}` | React `.map()` |
|-|-------------------|----------------|
| 문법 | 블록 문법 (선언적) | JS 배열 메서드 (명령적) |
| key | `(item.id)` 괄호 안 | `key={item.id}` prop으로 |
| 빈 배열 처리 | `{#each}` 전에 `{#if}` 분기 | `.map()` 전에 `if` early return |
| 인덱스 접근 | `{#each items as item, i}` | `.map((item, i) => ...)` |
| 구조분해 | `{#each items as { name, id }}` | `.map(({ name, id }) => ...)` |

빈 배열 처리는 Svelte에서도 별도 분기가 필요하다:

```svelte
<!-- Svelte 4: 빈 배열은 {#if}로 분기 -->
{#if items.length === 0}
  <p>항목이 없습니다</p>
{:else}
  {#each items as item (item.id)}
    <li>{item.name}</li>
  {/each}
{/if}
```

```tsx
// React: early return으로 처리
if (items.length === 0) {
    return <p>항목이 없습니다</p>;
}
return (
    <ul>
        {items.map((item) => (
            <li key={item.id}>{item.name}</li>
        ))}
    </ul>
);
```

- **배열 인덱스를 key로 쓰면 안 된다** — Svelte의 `(key)` 파라미터와 동일한 역할

---

## 프로젝트 코드로 배우기

### 예제 1: 로그인 페이지

> 파일: `src/app/(auth)/login/page.tsx`

#### 이벤트 핸들링: 수식어가 없다

```tsx
// React (23행, 58행)
const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();   // ← 수동으로 호출해야 한다
    // ...
};
<form onSubmit={handleSubmit}>
```

```svelte
<!-- Svelte 4: |preventDefault 수식어로 한 줄 -->
<form on:submit|preventDefault={handleSubmit}>
```

- Svelte 4의 `|preventDefault`, `|stopPropagation` 같은 수식어가 React에는 없다
- 항상 핸들러 함수 안에서 직접 호출
- Vue의 `.prevent`, `.stop` 수식어도 마찬가지로 React에는 없다

#### 양방향 바인딩: `bind:value` 없음

```tsx
// React (61~68행) — value와 onChange를 분리해서 작성
<Input
    value={email}
    onChange={(event) => setEmail(event.target.value)}
/>
```

```svelte
<!-- Svelte 4: bind:value 한 줄이면 끝 -->
<input bind:value={email} />
```

- Svelte의 `bind:value`는 양방향 바인딩을 자동으로 해준다
- React에는 이 편의 기능이 없다. **value + onChange를 항상 수동으로** 작성
- 이걸 **"제어 컴포넌트(Controlled Component)"**라 부른다
- 번거롭지만 데이터 흐름이 명시적이라 디버깅이 쉽다
- (Vue의 `v-model`도 마찬가지로 React에 없다)

#### 조건부 텍스트: 삼항 연산자

```tsx
// React (96~98행)
<Button disabled={isLoading}>
    {isLoading ? "로그인 중..." : "로그인"}
</Button>
```

```svelte
<!-- Svelte 4: 두 가지 방법 -->
<!-- 방법 1: 블록 (장황하지만 명확) -->
<button disabled={isLoading}>
  {#if isLoading}로그인 중...{:else}로그인{/if}
</button>

<!-- 방법 2: 삼항 (React와 동일) -->
<button disabled={isLoading}>
  {isLoading ? "로그인 중..." : "로그인"}
</button>
```

사실 Svelte에서도 인라인 텍스트에 삼항을 쓸 수 있다. **간단한 조건은 삼항이 더 깔끔** — 이건 프레임워크 불문.

#### 조건부 렌더링: && 패턴

```tsx
// React (101~103행)
{errorMessage && (
    <p className="text-destructive">{errorMessage}</p>
)}
```

```svelte
<!-- Svelte 4 -->
{#if errorMessage}
  <p class="text-destructive">{errorMessage}</p>
{/if}
```

`&&` 패턴: 왼쪽이 truthy면 오른쪽을 렌더링, falsy면 아무것도 안 함.
Svelte의 `{#if}`가 더 읽기 쉽지만, React에서는 이게 관용적 표현이니 익숙해져야 한다.

#### JSX 공백 문제

```tsx
// React (106행) — 공백을 명시적으로 넣어야 한다
계정이 없나요?{" "}
<Link href="/register">회원가입</Link>
```

```svelte
<!-- Svelte: 그냥 공백이 알아서 들어간다 -->
계정이 없나요?
<a href="/register">회원가입</a>
```

JSX는 줄바꿈 후 연속 공백을 무시한다. `{" "}`로 명시해야 하는 건 JSX 특유의 불편함.

---

### 예제 2: 월별 요약 카드

> 파일: `src/components/dashboard/MonthlySummaryCard.tsx`

#### 동적 클래스

```tsx
// React (52행) — 템플릿 리터럴로 클래스 조합
<span className={`text-sm font-semibold ${
    summary.balance >= 0 ? "text-income" : "text-expense"
}`}>
```

```svelte
<!-- Svelte 4: class: 디렉티브 -->
<span
  class="text-sm font-semibold"
  class:text-income={summary.balance >= 0}
  class:text-expense={summary.balance < 0}
>
```

- Svelte의 `class:name={condition}` 디렉티브는 **매우 직관적**
- React에는 이런 디렉티브가 없다. 문자열을 직접 조합해야 한다
- Tailwind 프로젝트에서는 `cn()` 유틸(clsx + tailwind-merge)을 쓰면 더 깔끔:

```tsx
// cn() 유틸 사용 (권장)
<span className={cn(
    "text-sm font-semibold",
    summary.balance >= 0 ? "text-income" : "text-expense"
)}>
```

---

### 예제 3: 거래 목록

> 파일: `src/components/transaction/TransactionList.tsx`

#### 중첩 리스트 렌더링

```tsx
// React (71~85행) — .map() 중첩
{groups.map((group) => (
    <div key={group.date}>
        <span>{group.label}</span>
        {group.transactions.map((tx) => (
            <TransactionItem key={tx.id} tx={tx} onEdit={handleEdit} />
        ))}
        <Separator />
    </div>
))}
```

```svelte
<!-- Svelte 4: {#each} 중첩 -->
{#each groups as group (group.date)}
  <div>
    <span>{group.label}</span>
    {#each group.transactions as tx (tx.id)}
      <TransactionItem {tx} on:edit={handleEdit} />
    {/each}
    <Separator />
  </div>
{/each}
```

구조는 동일하다. `key` 지정 위치만 다르다: Svelte는 `(key)` 괄호, React는 `key={...}` prop.

#### Fragment 사용

```tsx
// React (67~100행)
return (
    <>
        <div className="mt-2">...</div>
        {editingTx && <TransactionEditSheet ... />}
    </>
);
```

```svelte
<!-- Svelte: Fragment 불필요, 그냥 나열 -->
<div class="mt-2">...</div>
{#if editingTx}
  <TransactionEditSheet ... />
{/if}
```

Svelte에서는 필요 없는 `<>`가 React에서는 필수.

#### Early Return 패턴

```tsx
// React (51~63행) — 빈 상태를 먼저 리턴해버린다
if (transactions.length === 0) {
    return (
        <div>
            <p>거래 내역이 없습니다</p>
        </div>
    );
}
// 이 아래는 데이터가 있을 때만 실행
const groups = groupTransactionsByDate(transactions);
return <div>...</div>;
```

```svelte
<!-- Svelte 4: {#if}{:else}로 처리 — early return 불가능 -->
{#if transactions.length === 0}
  <div>
    <p>거래 내역이 없습니다</p>
  </div>
{:else}
  <!-- 데이터가 있을 때의 마크업 전체가 {:else} 안에 -->
{/if}
```

**이것이 React와 Svelte의 근본적 차이**:
- Svelte의 HTML 영역에서는 early return을 할 수 없다. `{#if}{:else}`로 분기해야 한다
- React는 **렌더링 자체가 함수**이므로 어디서든 `return`으로 빠져나올 수 있다
- 조건이 많을수록 React의 early return이 Svelte의 중첩 `{#if}`보다 평탄(flat)해진다

---

## 코드 리뷰: 프로젝트에서 발견한 문제

### `TransactionList.tsx` 89~91행 — 중복 조건 + 애니메이션 버그 가능성

```tsx
// 현재 코드
{editingTx && (
    <TransactionEditSheet
        open={!!editingTx}  // ← 여기 올 때 이미 editingTx는 truthy. 항상 true다
        onOpenChange={(open) => {
            if (!open) setEditingTx(null);
        }}
        transaction={editingTx}
        categories={categories}
        accounts={accounts}
    />
)}
```

**문제 1: 중복 조건**
`editingTx &&` 가드를 통과했으면 `!!editingTx`는 무조건 `true`. 의미 없는 코드다.

**문제 2: 닫힘 애니메이션 끊김**
`editingTx &&`로 조건부 렌더링하면, `setEditingTx(null)` 호출 시 컴포넌트가 **즉시 언마운트**된다. Sheet의 닫힘 애니메이션(slide down)이 재생되기 전에 사라져버린다.

```svelte
<!-- Svelte 4에서도 같은 실수를 할 수 있다 -->
{#if editingTx}
  <!-- editingTx가 null이 되면 즉시 파괴 → 애니메이션 끊김 -->
  <Sheet open={!!editingTx}>...</Sheet>
{/if}

<!-- Svelte 4 해결: transition: 디렉티브로 퇴장 애니메이션 보장 -->
{#if editingTx}
  <div transition:slide>...</div>
{/if}
```

**React 개선안:**

```tsx
// 조건부 렌더링 제거, open prop으로만 제어
// → Sheet가 닫힘 애니메이션을 완료한 뒤 내부적으로 숨김 처리
<TransactionEditSheet
    open={!!editingTx}
    onOpenChange={(open) => {
        if (!open) setEditingTx(null);
    }}
    transaction={editingTx}
    categories={categories}
    accounts={accounts}
/>
```

이 방식이면 `open`이 `false`로 바뀔 때 Sheet 컴포넌트 자체는 DOM에 남아있어서 닫힘 애니메이션이 자연스럽게 동작한다. 단, `transaction` prop이 `null`을 허용해야 한다.

---

## 치트시트: Svelte 4 → React JSX

| 개념 | Svelte 4 | React JSX | 비고 |
|------|----------|-----------|------|
| 파일 구조 | `<script>` + HTML + `<style>` | 전체가 JS, return 안에 JSX | React에 `<style>` 블록 없음 |
| 변수 선언 | `let count = 0;` | `const [count, setCount] = useState(0);` | 1-3에서 상세 |
| CSS 클래스 | `class=""` | `className=""` | JS 예약어 회피 |
| label 연결 | `for=""` | `htmlFor=""` | JS 예약어 회피 |
| 보간 | `{expr}` | `{expr}` | **동일** |
| 양방향 바인딩 | `bind:value` | `value` + `onChange` | 수동 제어 |
| 조건부 렌더링 | `{#if}` / `{:else}` | 삼항 `? :` 또는 `&&` | 블록 문법 없음 |
| 리스트 렌더링 | `{#each items as item (key)}` | `items.map(item => <... key={key}>)` | 블록 문법 없음 |
| 빈 리스트 | `{#if list.length === 0}` 분기 | `if (list.length === 0) return` | 둘 다 별도 분기 |
| 이벤트 | `on:click={handler}` | `onClick={handler}` | camelCase |
| 이벤트 수식어 | `on:click\|preventDefault` | `e.preventDefault()` 수동 | 수식어 없음 |
| 동적 클래스 | `class:name={cond}` | 템플릿 리터럴 / `cn()` | 디렉티브 없음 |
| 다중 루트 | 허용 | `<>...</>` Fragment 필수 | |
| 공백 | 자동 | `{" "}` 명시 필요 | JSX 특유 |
| HTML 문자열 | `{@html str}` | `dangerouslySetInnerHTML` | 둘 다 XSS 주의 |
| Scoped CSS | `<style>` 자동 스코프 | CSS Modules / Tailwind | React 자체 스코프 없음 |

### Svelte 4에는 있지만 React에 없는 것

- `{#if}`, `{#each}`, `{#await}` 블록 문법
- `bind:value`, `bind:group` 양방향 바인딩
- `class:name={condition}` 클래스 디렉티브
- `transition:`, `in:`, `out:`, `animate:` 디렉티브
- `on:click|preventDefault` 이벤트 수식어
- `<style>` 자동 스코프 CSS
- `$:` 리액티브 선언 (1-3, 2-2에서 다룸)

**React의 철학**: "별도의 DSL을 만들지 말고, JS로 다 하자." 그래서 편의 문법이 적지만, JS를 잘 아는 사람에게는 오히려 자유롭다.

---

## 다음 단계

[1-2. 컴포넌트 & Props →](./1-2-components-props.md)
