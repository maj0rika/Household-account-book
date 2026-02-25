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
