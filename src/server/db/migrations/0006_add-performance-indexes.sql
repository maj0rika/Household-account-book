CREATE INDEX IF NOT EXISTS "transactions_user_date_idx" ON "transactions" ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_user_type_date_idx" ON "transactions" ("user_id","type","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_category_idx" ON "transactions" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recurring_tx_user_active_idx" ON "recurring_transactions" ("user_id","is_active");
