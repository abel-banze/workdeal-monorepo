import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  prepareThreshold: 0,
});

const sql = `
CREATE TYPE analytics_event_type AS ENUM (
  'page_view',
  'contact_click',
  'whatsapp_click',
  'phone_click',
  'email_click',
  'website_click',
  'save',
  'quote_request',
  'search_impression'
);

CREATE TABLE IF NOT EXISTS analytics_event (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  profile_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  event_type analytics_event_type NOT NULL,
  visitor_id TEXT,
  province TEXT,
  district TEXT,
  referrer TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_event_profile_idx ON analytics_event(profile_id, created_at);
CREATE INDEX IF NOT EXISTS analytics_event_type_idx ON analytics_event(event_type, created_at);
CREATE INDEX IF NOT EXISTS analytics_event_visitor_idx ON analytics_event(visitor_id);
`;

async function main() {
  try {
    await pool.query(sql);
    console.log("✅ analytics_event table created");
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "42710") {
      console.log("⚠️  Type already exists, trying without enum...");
      const sqlAlt = `
CREATE TABLE IF NOT EXISTS analytics_event (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  profile_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  visitor_id TEXT,
  province TEXT,
  district TEXT,
  referrer TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS analytics_event_profile_idx ON analytics_event(profile_id, created_at);
CREATE INDEX IF NOT EXISTS analytics_event_type_idx ON analytics_event(event_type, created_at);
CREATE INDEX IF NOT EXISTS analytics_event_visitor_idx ON analytics_event(visitor_id);
`;
      await pool.query(sqlAlt);
      console.log("✅ analytics_event table created (text type)");
    } else {
      throw e;
    }
  } finally {
    await pool.end();
  }
}

main();
