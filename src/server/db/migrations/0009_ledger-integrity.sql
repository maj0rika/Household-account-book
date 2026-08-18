ALTER TYPE "transaction_type" ADD VALUE IF NOT EXISTS 'transfer';

ALTER TABLE "transactions"
	ADD COLUMN IF NOT EXISTS "transfer_account_id" uuid
		REFERENCES "accounts"("id") ON DELETE SET NULL;

ALTER TABLE "transactions"
	ADD COLUMN IF NOT EXISTS "recurring_rule_id" uuid
		REFERENCES "recurring_transactions"("id") ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "transactions_user_recurring_rule_date_unique"
	ON "transactions" ("user_id", "recurring_rule_id", "date")
	WHERE "recurring_rule_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "accounts_id_user_id_unique"
	ON "accounts" ("id", "user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "budgets_user_month_overall_unique"
	ON "budgets" ("user_id", "month")
	WHERE "category_id" IS NULL;
