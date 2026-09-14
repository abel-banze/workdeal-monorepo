CREATE TABLE "ai_credentials" (
	"provider" text PRIMARY KEY NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"provider" text DEFAULT 'mock' NOT NULL,
	"model_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"budgets" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
