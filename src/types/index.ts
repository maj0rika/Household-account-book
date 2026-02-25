export interface Transaction {
	id: string;
	userId: string;
	categoryId: string | null;
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
