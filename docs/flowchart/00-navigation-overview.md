# 전체 네비게이션 개요

이 문서는 라우트 진입, 보호 경로 검사, 공통 레이아웃, 전역 입력 진입점을 중간 밀도 차트로 정리한다.

## 차트 1. 진입과 인증 게이트

```mermaid
flowchart TD
	A["사용자 URL 진입"] --> B["middleware 쿠키 검사"];
	B -->|보호 경로 + 쿠키 없음| C["/login 이동"];
	B -->|통과| D["App Router 페이지"];

	D --> E["루트 또는 보호 페이지"];
	E --> F["서버 세션 확인"];
	F -->|세션 있음| G["/transactions 또는 요청 페이지"];
	F -->|세션 없음| C;

	C --> H["AuthLayout"];
	H --> I["authClient.getSession()"];
	I -->|세션 있음| G;
	I -->|세션 없음| J["/login 또는 /register 렌더"];
```

## 차트 2. 대시보드 공통 쉘과 이동

```mermaid
flowchart TD
	A["보호 페이지 진입"] --> B["DashboardLayout"];
	B --> C["세션 재검증"];
	C -->|세션 없음| D["/login 이동"];
	C -->|세션 있음| E["categories + accounts 준비"];

	E --> F["공통 UI mount"];
	F --> G["Sidebar / BottomTabBar"];
	F --> H["전역 입력 시스템"];
	H --> I["ManualInputDialog + NaturalInputBar"];

	G --> J["탭 이동"];
	J --> K["transactions / statistics / assets / budget / settings"];
	G --> L["직접 입력"];
	L --> I;

	F --> M["RoutePrefetcher"];
	M --> N["핵심 탭 prefetch"];

	K --> O["페이지별 서버 조회"];
	O --> P["transactions: 월 요약/달력/목록"];
	O --> Q["statistics: 요약/추이/랭킹"];
	O --> R["assets: 계정/순자산"];
	O --> S["budget: 예산/카테고리"];
	O --> T["settings: 세션/카테고리"];
```

## 차트 3. 거래·통계·예산 첫 접근

```mermaid
flowchart TD
	A["사이드 메뉴 클릭"] --> B{"transactions / statistics / budget"};

	B -->|transactions| C["TransactionsPage"];
	C --> D["month 확정 + recurring 자동 적용 예약"];
	D --> E["요약 / 달력 / 인사이트 조회"];
	E --> F["MonthNavigator + MonthlySummaryCard + TransactionsLazySections"];

	B -->|statistics| G["StatisticsPage"];
	G --> H["month / category 기본값 확정"];
	H --> I["요약 + 추이 + 랭킹 조회"];
	I --> J["MonthNavigator + StatisticsLazySections"];

	B -->|budget| K["BudgetPage"];
	K --> L["month 확정"];
	L --> M["getBudgetsWithSpent + getUserCategories"];
	M --> N["BudgetProgressList + BudgetForm"];
```

## 차트 4. 직접 입력·자산·설정 첫 접근

```mermaid
flowchart TD
	A["사이드 메뉴 클릭"] --> B{"직접 입력 / assets / settings"};

	B -->|직접 입력| C["useManualInput.open()"];
	C --> D["GlobalManualInputDialog"];
	D --> E["DashboardLayout의 initialCategories + initialAccounts 사용"];
	E --> F["UnifiedInputSection"];
	F --> G["직접 입력 / 자연어·이미지 분기"];

	B -->|assets| H["AssetsPage"];
	H --> I["getAccounts + getAccountSummary"];
	I --> J["복호화 + 순자산 계산"];
	J --> K["NetWorthCard + AccountList"];

	B -->|settings| L["SettingsPage"];
	L --> M["getServerSession + getUserCategories"];
	M --> N["ProfileSection + CategoryManager + ThemeToggle"];
```

## 포함 액션

- 루트 진입;
- 보호 경로 접근;
- 로그인/회원가입 화면 우회;
- 사이드바/하단 탭 네비게이션;
- 사이드 메뉴 최초 진입;
- 전역 직접 입력 다이얼로그 열기;
- 각 대시보드 페이지의 서버 데이터 로드;

## 관련 코드

- `src/app/page.tsx`;
- `middleware.ts`;
- `src/app/(auth)/layout.tsx`;
- `src/app/(dashboard)/layout.tsx`;
- `src/components/layout/Sidebar.tsx`;
- `src/components/layout/BottomTabBar.tsx`;
- `src/components/layout/RoutePrefetcher.tsx`;
- `src/components/providers/ManualInputProvider.tsx`;
- `src/components/providers/GlobalManualInputDialog.tsx`;
- `src/components/transaction/UnifiedInputSection.tsx`;
