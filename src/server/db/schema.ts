import {
	boolean,
	date,
	integer,
	pgEnum,
	pgTable,
	timestamp,
	uuid,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense"]);

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

export const transactions = pgTable("transactions", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => authUsers.id, { onDelete: "cascade" }),
	categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
	type: transactionTypeEnum("type").notNull(),
	amount: integer("amount").notNull(),
	description: text("description").notNull(),
	originalInput: text("original_input"),
	date: date("date").notNull(),
	memo: text("memo"),
	isRecurring: boolean("is_recurring").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const recurringTransactions = pgTable("recurring_transactions", {
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
});

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
