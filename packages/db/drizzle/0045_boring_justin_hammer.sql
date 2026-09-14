CREATE TYPE "public"."negotiation_message_kind" AS ENUM('text', 'offer', 'system');--> statement-breakpoint
CREATE TYPE "public"."negotiation_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "negotiation_message" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"sender_user_id" text NOT NULL,
	"sender_profile_id" text,
	"kind" "negotiation_message_kind" DEFAULT 'text' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"price_mzn" integer,
	"estimated_days" integer,
	"seen_by_requester" boolean DEFAULT false NOT NULL,
	"seen_by_provider" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "negotiation_thread" (
	"id" text PRIMARY KEY NOT NULL,
	"task_proposal_id" text NOT NULL,
	"task_id" text NOT NULL,
	"status" "negotiation_status" DEFAULT 'open' NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "negotiation_thread_task_proposal_id_unique" UNIQUE("task_proposal_id")
);
--> statement-breakpoint
ALTER TABLE "negotiation_message" ADD CONSTRAINT "negotiation_message_thread_id_negotiation_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."negotiation_thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_message" ADD CONSTRAINT "negotiation_message_sender_user_id_user_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_message" ADD CONSTRAINT "negotiation_message_sender_profile_id_profile_id_fk" FOREIGN KEY ("sender_profile_id") REFERENCES "public"."profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_thread" ADD CONSTRAINT "negotiation_thread_task_proposal_id_task_proposal_id_fk" FOREIGN KEY ("task_proposal_id") REFERENCES "public"."task_proposal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_thread" ADD CONSTRAINT "negotiation_thread_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "negotiation_message_thread_idx" ON "negotiation_message" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "negotiation_thread_task_idx" ON "negotiation_thread" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "negotiation_thread_last_message_idx" ON "negotiation_thread" USING btree ("last_message_at");