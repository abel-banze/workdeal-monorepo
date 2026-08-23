CREATE TABLE "file" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"public_id" text NOT NULL,
	"resource_type" text NOT NULL,
	"format" text,
	"bytes" integer,
	"original_filename" text,
	"uploaded_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "quote_file" (
	"quote_request_id" text NOT NULL,
	"file_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quote_file_quote_request_id_file_id_pk" PRIMARY KEY("quote_request_id","file_id")
);--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_file" ADD CONSTRAINT "quote_file_quote_request_id_quote_request_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_file" ADD CONSTRAINT "quote_file_file_id_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_uploaded_by_idx" ON "file" USING btree ("uploaded_by_user_id");--> statement-breakpoint
CREATE INDEX "file_created_idx" ON "file" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "quote_file_quote_idx" ON "quote_file" USING btree ("quote_request_id");--> statement-breakpoint
CREATE INDEX "quote_file_file_idx" ON "quote_file" USING btree ("file_id");
