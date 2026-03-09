ALTER TABLE "accounts" ALTER COLUMN "balance" SET DATA TYPE text USING "balance"::text;
ALTER TABLE "accounts" ALTER COLUMN "balance" SET DEFAULT '0';
