ALTER TABLE "accounts"
	ADD COLUMN IF NOT EXISTS "name_enc" text,
	ADD COLUMN IF NOT EXISTS "balance_enc" text;

ALTER TABLE "transactions"
	ADD COLUMN IF NOT EXISTS "amount_enc" text,
	ADD COLUMN IF NOT EXISTS "description_enc" text,
	ADD COLUMN IF NOT EXISTS "original_input_enc" text,
	ADD COLUMN IF NOT EXISTS "memo_enc" text;

ALTER TABLE "recurring_transactions"
	ADD COLUMN IF NOT EXISTS "amount_enc" text,
	ADD COLUMN IF NOT EXISTS "description_enc" text;
