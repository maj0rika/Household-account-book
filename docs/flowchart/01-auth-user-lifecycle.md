# 인증과 사용자 생명주기

이 문서는 회원가입, 로그인, 로그아웃, 계정 삭제 흐름과 데이터 삭제 범위를 정리한다.

```mermaid
flowchart TD
	subgraph Register["회원가입"]
		R0["/register<br/>RegisterPage"] --> R1["authClient.signUp.email()"];
		R1 --> R2["/api/auth/[...all]/route.ts"];
		R2 --> R3["src/server/auth.ts<br/>betterAuth sign-up"];
		R3 --> R4["authUsers / authAccounts / authSessions 생성"];
		R4 --> R5["databaseHooks.user.create.after"];
		R5 --> R6["DEFAULT_CATEGORIES를 categories 테이블에 일괄 삽입"];
		R6 --> R7["callbackURL '/'"];
		R7 --> R8["src/app/page.tsx"];
		R8 --> R9["getServerSession()"];
		R9 --> R10["redirect('/transactions')"];
	end

	subgraph Login["로그인"]
		L0["/login<br/>LoginPage"] --> L1["authClient.signIn.email()"];
		L1 --> L2["/api/auth/[...all]/route.ts"];
		L2 --> L3["betterAuth sign-in"];
		L3 --> L4["authSessions 생성/갱신"];
		L4 --> L5["callbackURL '/'"];
		L5 --> R8;
	end

	subgraph Logout["로그아웃"]
		O0["설정 > ProfileSection"] --> O1["authClient.signOut()"];
		O1 --> O2["클라이언트 세션 쿠키 정리"];
		O2 --> O3["router.push('/login')"];
	end

	subgraph Delete["계정 삭제"]
		D0["설정 > DeleteAccountDialog"] --> D1["비밀번호 입력"];
		D1 --> D2["deleteUserAccount(password)"];
		D2 --> D3["authAccounts(providerId='credential')에서 hash 조회"];
		D3 --> D4["verifyPassword()"];
		D4 -->|불일치| D5["오류 메시지 반환"];
		D4 -->|일치| D6["db.delete(authUsers)"];
		D6 --> D7["FK cascade"];
		D7 --> D8["authSessions / authAccounts / categories / transactions / recurring_transactions / budgets / accounts 삭제"];
		D8 --> D9["authClient.signOut()"];
		D9 --> O3;
	end
```

## 보조 분기

- `middleware.ts`는 보호 경로에서 세션 쿠키만 빠르게 확인한다;
- `src/app/(dashboard)/layout.tsx`는 서버에서 `getServerSession()`으로 다시 검증한다;
- `src/app/(auth)/layout.tsx`는 이미 로그인한 사용자를 `/transactions`로 되돌린다;

## 관련 코드

- `src/app/(auth)/login/page.tsx`;
- `src/app/(auth)/register/page.tsx`;
- `src/app/(auth)/layout.tsx`;
- `src/app/api/auth/[...all]/route.ts`;
- `src/server/auth.ts`;
- `src/components/settings/ProfileSection.tsx`;
- `src/components/settings/DeleteAccountDialog.tsx`;
- `src/server/actions/settings.ts`;
- `src/server/db/schema.ts`;
