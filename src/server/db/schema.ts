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

export const users = pgTable(
	"users",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		email: text("email").notNull(),
		name: text("name").notNull(),
		avatarUrl: text("avatar_url"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		emailUnique: uniqueIndex("users_email_unique").on(table.email),
	}),
);

export const categories = pgTable(
	"categories",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
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
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
	type: transactionTypeEnum("type").notNull(),
	amount: integer("amount").notNull(),
	description: text("description").notNull(),
	originalInput: text("original_input"),
	date: date("date").notNull(),
	memo: text("memo"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const budgets = pgTable(
	"budgets",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
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
