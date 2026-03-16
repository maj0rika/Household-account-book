CREATE TABLE "rateLimit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL UNIQUE,
	"count" integer NOT NULL,
	"lastRequest" bigint NOT NULL
);

CREATE TABLE "security_rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"key_hash" text NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamptz DEFAULT now() NOT NULL,
	"blocked_until" timestamptz,
	"consecutive_blocks" integer DEFAULT 0 NOT NULL,
	"last_reason" text,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "security_rate_limits_scope_key_hash_unique" UNIQUE("scope", "key_hash")
);

CREATE INDEX "security_rate_limits_blocked_until_idx"
	ON "security_rate_limits" ("blocked_until");

CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"scope" text NOT NULL,
	"key_hash" text,
	"reason" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "security_events_scope_created_at_idx"
	ON "security_events" ("scope", "created_at");

CREATE INDEX "security_events_type_created_at_idx"
	ON "security_events" ("type", "created_at");
