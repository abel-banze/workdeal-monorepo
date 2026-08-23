-- P: Services catalog for company profile composition
CREATE TABLE IF NOT EXISTS "service" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL REFERENCES "profile"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "price_mzn" integer,
  "image_url" text,
  "category_id" text REFERENCES "category"("id") ON DELETE SET NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "service_profile_id_idx" ON "service" USING btree ("profile_id");
CREATE INDEX IF NOT EXISTS "service_category_id_idx" ON "service" USING btree ("category_id");
