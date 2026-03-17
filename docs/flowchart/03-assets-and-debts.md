# 자산과 부채 플로우

이 문서는 자산/부채 조회, 수동 관리, 파싱 결과 저장을 중간 밀도 차트로 정리한다.

## 차트 1. 자산/부채 첫 접근

```mermaid
flowchart TD
	A["/assets 클릭"] --> B["AssetsPage"];
	B --> C["getAccounts + getAccountSummary"];
	C --> D["name / balance 복호화"];
	C --> E["순자산 합산"];
	D --> F["AccountList"];
	E --> G["NetWorthCard"];
	F --> H["추가 / 수정 / 삭제 또는 파싱 저장"];
	G --> H;
```

## 차트 2. 조회와 수동 관리

```mermaid
flowchart TD
	A["/assets 진입"] --> B["getAccounts + getAccountSummary"];
	B --> C["복호화 + 자산/부채 합산"];
	C --> D["NetWorthCard + AccountList"];

	D --> E{"사용자 액션"};
	E -->|추가/수정| F["AccountFormSheet"];
	E -->|삭제| G["deleteAccount()"];

	F --> H{"create / edit"};
	H -->|create| I["createAccount()"];
	H -->|edit| J["updateAccount()"];
	I --> K["name + balance 암호화 저장"];
	J --> L["변경 필드 암호화 갱신"];
	K --> M["account 캐시 무효화"];
	L --> M;

	G --> N["isActive=false soft delete"];
	N --> M;
	M --> O["AssetsPage 재렌더"];
```

## 차트 3. 파싱 결과 저장

```mermaid
flowchart TD
	A["parsed.accounts"] --> B["AccountParseResultSheet"];
	B --> C["기존 계정 매칭"];
	C --> D{"초기 매칭 있음?"};
	D -->|예| E["update 기본값"];
	D -->|아니오| F["create 기본값"];

	E --> G["사용자 편집"];
	F --> G;
	G --> H{"asset / debt"};
	H -->|asset| I["bank / cash / savings / investment / other"];
	H -->|debt| J["credit_card / loan / other"];

	I --> K["upsertParsedAccountsBatch()"];
	J --> K;
	K --> L["DB 트랜잭션"];
	L --> M["update면 기존 계정 갱신"];
	L --> N["create면 신규 계정 생성"];
	M --> O["account 캐시 무효화"];
	N --> O;
	O --> P{"혼합 입력?"};
	P -->|아니오| Q["/assets?saved=account&focus=accounts"];
	P -->|예| R["/transactions?saved=mixed&focus=list"];
```

## 핵심 데이터 처리

- `accounts.name`, `accounts.balance`는 저장 시 암호화되고 조회 시 복호화된다;
- `getAccountSummary()`는 DB `SUM()` 대신 애플리케이션 레벨에서 복호화 후 합산한다;
- 삭제는 실제 row 삭제가 아니라 `isActive=false` 처리라 거래 이력의 `accountId` 참조를 보존한다;

## 관련 코드

- `src/app/(dashboard)/assets/page.tsx`;
- `src/components/assets/AccountList.tsx`;
- `src/components/assets/AccountFormSheet.tsx`;
- `src/components/assets/AccountParseResultSheet.tsx`;
- `src/components/assets/NetWorthCard.tsx`;
- `src/server/actions/account.ts`;
- `src/server/db/schema.ts`;
