import {
	boolean,
	date,
	index,
	integer,
	pgEnum,
	pgTable,
	timestamp,
	uuid,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense"]);
export const accountTypeEnum = pgEnum("account_type", ["asset", "debt"]);
export const settlementRoleEnum = pgEnum("settlement_role", ["organizer", "participant"]);
export const settlementStatusEnum = pgEnum("settlement_status", ["pending", "partial", "completed"]);
export const settlementMemberStatusEnum = pgEnum("settlement_member_status", ["pending", "partial", "paid"]);
export const settlementTransferDirectionEnum = pgEnum("settlement_transfer_direction", ["receive", "send"]);

// ── Auth 테이블 (better-auth 관리) ──

export const authUsers = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: text("image"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const authSessions = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => authUsers.id, { onDelete: "cascade" }),
});

export const authAccounts = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => authUsers.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const authVerifications = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }),
	updatedAt: timestamp("updated_at", { withTimezone: true }),
});

// ── 앱 테이블 (authUsers.id 직접 참조) ──

export const categories = pgTable(
	"categories",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id").references(() => authUsers.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		icon: text("icon").notNull(),
		type: transactionTypeEnum("type").notNull(),
		sortOrder: integer("sort_order").notNull().default(0),
		isDefault: boolean("is_default").notNull().default(false),
	},
	(table) => ({
		userTypeNameUnique: uniqueIndex("categories_user_type_name_unique").on(
			table.userId,
			table.type,
			table.name,
		),
	}),
);

export const transactions = pgTable(
	"transactions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => authUsers.id, { onDelete: "cascade" }),
		categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
		accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
		type: transactionTypeEnum("type").notNull(),
		amount: integer("amount").notNull(),
		accountImpactAmount: integer("account_impact_amount"),
		description: text("description").notNull(),
		originalInput: text("original_input"),
		date: date("date").notNull(),
		memo: text("memo"),
		isRecurring: boolean("is_recurring").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		userDateIdx: index("transactions_user_date_idx").on(table.userId, table.date),
		userTypeDateIdx: index("transactions_user_type_date_idx").on(table.userId, table.type, table.date),
		categoryIdx: index("transactions_category_idx").on(table.categoryId),
		accountIdx: index("transactions_account_idx").on(table.accountId),
	}),
);

export const recurringTransactions = pgTable(
	"recurring_transactions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => authUsers.id, { onDelete: "cascade" }),
		categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
		type: transactionTypeEnum("type").notNull(),
		amount: integer("amount").notNull(),
		description: text("description").notNull(),
		dayOfMonth: integer("day_of_month").notNull(), // 1~31, 매월 이 날짜에 자동 생성
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		userActiveIdx: index("recurring_tx_user_active_idx").on(table.userId, table.isActive),
	}),
);

export const budgets = pgTable(
	"budgets",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => authUsers.id, { onDelete: "cascade" }),
		categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
		amount: integer("amount").notNull(),
		month: text("month").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		userCategoryMonthUnique: uniqueIndex("budgets_user_category_month_unique").on(
			table.userId,
			table.categoryId,
			table.month,
		),
	}),
);

// ── 자산/부채 계정 ──

export const accounts = pgTable("accounts", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => authUsers.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	type: accountTypeEnum("type").notNull(), // 'asset' | 'debt'
	subType: text("sub_type").notNull(), // 'bank', 'cash', 'savings', 'investment', 'credit_card', 'loan', 'other'
	icon: text("icon").notNull().default("🏦"),
	balance: text("balance").notNull().default("0"), // 암호화된 잔액 (원)
	sortOrder: integer("sort_order").notNull().default(0),
	isActive: boolean("is_active").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const settlements = pgTable(
	"settlements",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => authUsers.id, { onDelete: "cascade" }),
		transactionId: uuid("transaction_id")
			.notNull()
			.references(() => transactions.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		totalAmount: integer("total_amount").notNull(),
		myShareAmount: integer("my_share_amount").notNull(),
		participantCount: integer("participant_count").notNull(),
		role: settlementRoleEnum("role").notNull(),
		status: settlementStatusEnum("status").notNull().default("pending"),
		sourceType: text("source_type").notNull().default("text"),
		sourceService: text("source_service").notNull().default("unknown"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		transactionUnique: uniqueIndex("settlements_transaction_id_unique").on(table.transactionId),
		userStatusIdx: index("settlements_user_status_idx").on(table.userId, table.status),
		userCreatedAtIdx: index("settlements_user_created_at_idx").on(table.userId, table.createdAt),
	}),
);

export const settlementMembers = pgTable(
	"settlement_members",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		settlementId: uuid("settlement_id")
			.notNull()
			.references(() => settlements.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		shareAmount: integer("share_amount").notNull(),
		status: settlementMemberStatusEnum("status").notNull().default("pending"),
		paidAmount: integer("paid_amount").notNull().default(0),
		paidAt: timestamp("paid_at", { withTimezone: true }),
		sortOrder: integer("sort_order").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		settlementSortIdx: index("settlement_members_settlement_sort_idx").on(table.settlementId, table.sortOrder),
		settlementStatusIdx: index("settlement_members_settlement_status_idx").on(table.settlementId, table.status),
	}),
);

export const settlementTransfers = pgTable(
	"settlement_transfers",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		settlementId: uuid("settlement_id")
			.notNull()
			.references(() => settlements.id, { onDelete: "cascade" }),
		memberId: uuid("member_id")
			.references(() => settlementMembers.id, { onDelete: "cascade" }),
		accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
		direction: settlementTransferDirectionEnum("direction").notNull(),
		amount: integer("amount").notNull(),
		occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
		memo: text("memo"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		settlementOccurredIdx: index("settlement_transfers_settlement_occurred_idx").on(table.settlementId, table.occurredAt),
		memberOccurredIdx: index("settlement_transfers_member_occurred_idx").on(table.memberId, table.occurredAt),
	}),
);
