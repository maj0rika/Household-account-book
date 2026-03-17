# 카테고리와 설정 플로우

이 문서는 설정 화면과 카테고리 수명주기를 중간 밀도 차트로 정리한다.

## 차트 1. 설정 첫 접근

```mermaid
flowchart TD
	A["/settings 클릭"] --> B["SettingsPage"];
	B --> C["getServerSession()"];
	B --> D["getUserCategories()"];
	C --> E["ProfileSection 사용자 정보"];
	D --> F["CategoryManager 카테고리 목록"];
	B --> G["ThemeToggle"];
	E --> H["설정 액션 진입"];
	F --> H;
	G --> H;
```

## 차트 2. 설정 화면과 카테고리 수명주기

```mermaid
flowchart TD
	A["/settings 진입"] --> B["세션 + categories 조회"];
	B --> C["ProfileSection / CategoryManager / ThemeToggle"];

	C --> D{"카테고리 액션"};
	D -->|직접 추가| E["addCategory()"];
	D -->|파싱 추천 추가| F["addCategory()"];
	D -->|삭제| G["deleteCategory()"];

	E --> H["sortOrder 계산 후 insert"];
	F --> I["성공/duplicate면 로컬 동기화"];
	G --> J["categories delete"];
	J --> K["기존 거래/예산/고정거래는 categoryId=null"];
	H --> L["category 캐시 무효화"];
	I --> L;
	K --> L;
	L --> M["화면 재렌더"];
```

## 차트 3. 테마 토글과 카테고리 수정 부재

```mermaid
flowchart TD
	A["ThemeToggle 클릭"] --> B["dark state 반전"];
	B --> C["html.dark class 토글"];
	C --> D["localStorage theme 저장"];
	D --> E["클라이언트 즉시 반영"];

	F["카테고리 수정 시도"] --> G["현재 UI 없음"];
	G --> H["updateCategory 서버 액션 없음"];
	H --> I["현재 프로젝트에서는 미구현"];
```

## 관련 코드

- `src/app/(dashboard)/settings/page.tsx`;
- `src/components/settings/CategoryManager.tsx`;
- `src/components/settings/ProfileSection.tsx`;
- `src/components/settings/ThemeToggle.tsx`;
- `src/server/actions/settings.ts`;
- `src/components/transaction/ParseResultSheet.tsx`;
- `src/server/db/schema.ts`;
