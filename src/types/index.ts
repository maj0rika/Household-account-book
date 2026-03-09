export interface Transaction {
	id: string;
	userId: string;
	categoryId: string | null;
	accountId: string | null;
	type: "income" | "expense";
	amount: number;
	accountImpactAmount: number | null;
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

export type SettlementRole = "organizer" | "participant";
export type SettlementStatus = "pending" | "partial" | "completed";
export type SettlementMemberStatus = "pending" | "partial" | "paid";
export type SettlementTransferDirection = "receive" | "send";

export interface SettlementSummary {
	id: string;
	transactionId: string;
	title: string;
	totalAmount: number;
	myShareAmount: number;
	participantCount: number;
	role: SettlementRole;
	status: SettlementStatus;
	sourceType: "text" | "image" | "manual";
	sourceService: "kakao" | "toss" | "unknown";
	outstandingAmount: number;
	settledAmount: number;
	memberCount: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface SettlementMember {
	id: string;
	settlementId: string;
	name: string;
	shareAmount: number;
	status: SettlementMemberStatus;
	paidAmount: number;
	paidAt: Date | null;
	sortOrder: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface SettlementTransfer {
	id: string;
	settlementId: string;
	memberId: string | null;
	accountId: string | null;
	direction: SettlementTransferDirection;
	amount: number;
	occurredAt: Date;
	memo: string | null;
	createdAt: Date;
}

export interface SettlementDetail extends SettlementSummary {
	members: SettlementMember[];
	transfers: SettlementTransfer[];
}

export interface SettlementDigest {
	pendingCount: number;
	receivableAmount: number;
	payableAmount: number;
	completedCount: number;
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
