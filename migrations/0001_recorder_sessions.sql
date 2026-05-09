-- recorder_sessions: persists session codes to the database so they survive
-- across Azure App Service instances (scale-out / restart).
-- The live SSE/WS connections are still in-memory; this table is used only
-- to validate that a code is legitimate when a Chrome Extension joins.
CREATE TABLE IF NOT EXISTS "recorder_sessions" (
  "id"         varchar(16) PRIMARY KEY,        -- e.g. "ABC-4821"
  "user_id"    varchar(64),                    -- NAT 2.0 user who created the session
  "tenant_id"  varchar(64),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL               -- created_at + 2 hours
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recorder_sessions_expires_at_idx" ON "recorder_sessions" ("expires_at");
