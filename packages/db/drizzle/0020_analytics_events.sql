-- Analytics events table for tracking profile visits, contact clicks, etc.

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

CREATE TABLE analytics_event (
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

CREATE INDEX analytics_event_profile_idx ON analytics_event(profile_id, created_at);
CREATE INDEX analytics_event_type_idx ON analytics_event(event_type, created_at);
CREATE INDEX analytics_event_visitor_idx ON analytics_event(visitor_id);
