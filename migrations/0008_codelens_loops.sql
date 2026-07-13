-- ASTRA Code Lens — Phase 5 loop/conform/PR/scheduler tables.
-- Idempotent (CREATE ... IF NOT EXISTS). Canonical path is `npm run db:push`
-- (drizzle from shared/schema.ts); this file is the manual/prod apply fallback.

CREATE TABLE IF NOT EXISTS codelens_schedules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          varchar(64),
  repo_url         varchar(500) NOT NULL,
  branch           varchar(200) NOT NULL,
  mode             varchar(20)  NOT NULL DEFAULT 'review',
  policy           varchar(40)  NOT NULL DEFAULT 'full_coverage',
  cadence_type     varchar(20)  NOT NULL DEFAULT 'interval',
  interval_minutes integer      DEFAULT 1440,
  daily_hour       integer      DEFAULT 0,
  daily_minute     integer      DEFAULT 0,
  enabled          boolean      NOT NULL DEFAULT true,
  last_run_at      timestamp,
  last_keys        text[],
  created_at       timestamp DEFAULT now(),
  updated_at       timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_codelens_schedules_enabled ON codelens_schedules (enabled);

CREATE TABLE IF NOT EXISTS codelens_loop_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   varchar(64) NOT NULL,
  user_id      varchar(64),
  mode         varchar(20) NOT NULL,
  policy       varchar(40) NOT NULL,
  iterations   integer DEFAULT 0,
  stop_reason  varchar(30),
  final_metric jsonb,
  created_at   timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_codelens_loop_runs_session ON codelens_loop_runs (session_id);

CREATE TABLE IF NOT EXISTS codelens_pr_policies (
  repo_full_name      varchar(300) PRIMARY KEY,
  enabled             boolean NOT NULL DEFAULT false,
  base_branch_pattern varchar(300) NOT NULL DEFAULT 'main,staging',
  mode                varchar(20) NOT NULL DEFAULT 'review',
  blocking            boolean NOT NULL DEFAULT false,
  push_mode           varchar(30) NOT NULL DEFAULT 'companion-pr',
  installation_id     integer,
  updated_at          timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS codelens_contested_findings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    varchar(64),
  user_id       varchar(64),
  violation_key varchar(400) NOT NULL,
  rule_id       varchar(10),
  reason        varchar(200),
  created_at    timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_codelens_contested_session ON codelens_contested_findings (session_id);

CREATE TABLE IF NOT EXISTS codelens_scheduler_locks (
  lock_key   varchar(100) PRIMARY KEY,
  holder     varchar(100),
  expires_at timestamp NOT NULL
);
