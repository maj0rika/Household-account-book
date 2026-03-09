CREATE TYPE "public"."settlement_member_status" AS ENUM('pending', 'partial', 'paid');--> statement-breakpoint
CREATE TYPE "public"."settlement_role" AS ENUM('organizer', 'participant');--> statement-breakpoint
CREATE TYPE "public"."settlement_status" AS ENUM('pending', 'partial', 'completed');--> statement-breakpoint
CREATE TYPE "public"."settlement_transfer_direction" AS ENUM('receive', 'send');--> statement-breakpoint
CREATE TABLE "settlement_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_id" uuid NOT NULL,
	"name" text NOT NULL,
	"share_amount" integer NOT NULL,
	"status" "settlement_member_status" DEFAULT 'pending' NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"paid_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_id" uuid NOT NULL,
	"member_id" uuid,
	"account_id" uuid,
	"direction" "settlement_transfer_direction" NOT NULL,
	"amount" integer NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"transaction_id" uuid NOT NULL,
	"title" text NOT NULL,
	"total_amount" integer NOT NULL,
	"my_share_amount" integer NOT NULL,
	"participant_count" integer NOT NULL,
	"role" "settlement_role" NOT NULL,
	"status" "settlement_status" DEFAULT 'pending' NOT NULL,
	"source_type" text DEFAULT 'text' NOT NULL,
	"source_service" text DEFAULT 'unknown' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "account_impact_amount" integer;--> statement-breakpoint
ALTER TABLE "settlement_members" ADD CONSTRAINT "settlement_members_settlement_id_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_transfers" ADD CONSTRAINT "settlement_transfers_settlement_id_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_transfers" ADD CONSTRAINT "settlement_transfers_member_id_settlement_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."settlement_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_transfers" ADD CONSTRAINT "settlement_transfers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "settlement_members_settlement_sort_idx" ON "settlement_members" USING btree ("settlement_id","sort_order");--> statement-breakpoint
CREATE INDEX "settlement_members_settlement_status_idx" ON "settlement_members" USING btree ("settlement_id","status");--> statement-breakpoint
CREATE INDEX "settlement_transfers_settlement_occurred_idx" ON "settlement_transfers" USING btree ("settlement_id","occurred_at");--> statement-breakpoint
CREATE INDEX "settlement_transfers_member_occurred_idx" ON "settlement_transfers" USING btree ("member_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "settlements_transaction_id_unique" ON "settlements" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "settlements_user_status_idx" ON "settlements" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "settlements_user_created_at_idx" ON "settlements" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "transactions_account_idx" ON "transactions" USING btree ("account_id");
