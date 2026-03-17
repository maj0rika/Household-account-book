// 파일 역할:
// - 도메인 공용 타입 정의 파일이다.
// 사용 위치:
// - `src/components/assets/AccountFormSheet.tsx`에서 이 파일을 import해 상위 흐름에 연결한다;
// - `src/components/assets/AccountList.tsx`에서 이 파일을 import해 상위 흐름에 연결한다;
// - `src/components/assets/AccountParseResultSheet.tsx`에서 이 파일을 import해 상위 흐름에 연결한다;
// 흐름:
// - 상위 호출자가 입력을 넘기고, 이 파일이 자신의 책임 범위만 처리한 뒤 결과를 반환하는 구조다;
export interface Transaction {
	id: string;
	userId: string;
	categoryId: string | null;
	accountId: string | null;
	type: "income" | "expense";
	amount: number;
	description: string;
	originalInput: string | null;
	date: string; // YYYY-MM-DD
	memo: string | null;
	isRecurring: boolean;
	createdAt: Date;
	updatedAt: Date;
	category: {
		id: string;
		name: string;
		icon: string;
		type: "income" | "expense";
	} | null;
	account: {
		id: string;
		name: string;
		icon: string;
	} | null;
}

export interface Category {
	id: string;
	userId: string | null;
	name: string;
	icon: string;
	type: "income" | "expense";
	sortOrder: number;
	isDefault: boolean;
}

export interface MonthlySummary {
	income: number;
	expense: number;
	balance: number;
}

export interface TransactionGroup {
	date: string; // YYYY-MM-DD
	label: string; // "오늘", "어제", "2월 23일 (일)"
	transactions: Transaction[];
}

export interface CategoryBreakdown {
	categoryId: string;
	categoryName: string;
	categoryIcon: string;
	amount: number;
	percentage: number; // 0~100
}

export interface DailyExpense {
	date: string; // YYYY-MM-DD
	amount: number;
}

export interface Account {
	id: string;
	userId: string;
	name: string;
	type: "asset" | "debt";
	subType: string; // 'bank', 'cash', 'savings', 'investment', 'credit_card', 'loan', 'other'
	icon: string;
	balance: number;
	sortOrder: number;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface AccountSummary {
	totalAssets: number;
	totalDebts: number;
	netWorth: number;
}
