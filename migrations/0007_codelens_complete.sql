-- ASTRA Code Lens — COMPLETE schema (idempotent, Code-Lens-only).
-- Safe to run against an existing prod DB: every statement is IF NOT EXISTS /
-- ADD COLUMN IF NOT EXISTS, so it only ADDS Code-Lens objects and never touches
-- or drops any other table. Re-running is a no-op.
--
-- Run with:  npx tsx scripts/apply-codelens-schema.ts   (DATABASE_URL must point at the target DB)

-- ── Core run storage (0005) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "codelens_runs" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"         varchar(64),
  "session_id"      varchar(64) UNIQUE NOT NULL,
  "repo_url"        varchar(500) NOT NULL,
  "branch"          varchar(200) NOT NULL,
  "commit_hash"     varchar(40),
  "started_at"      timestamp DEFAULT now() NOT NULL,
  "completed_at"    timestamp,
  "status"          varchar(20) DEFAULT 'RUNNING' NOT NULL,
  "total_files"     integer DEFAULT 0,
  "scanned_files"   integer DEFAULT 0,
  "ignored_files"   integer DEFAULT 0,
  "critical_count"  integer DEFAULT 0,
  "warning_count"   integer DEFAULT 0,
  "info_count"      integer DEFAULT 0,
  "pass_count"      integer DEFAULT 0,
  "compliance_pct"  numeric(5,2) DEFAULT 0,
  "folders_scanned" text[],
  "ignore_patterns" text[]
);
ALTER TABLE "codelens_runs" ADD COLUMN IF NOT EXISTS "user_id" varchar(64);

CREATE TABLE IF NOT EXISTS "codelens_file_results" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id"           uuid NOT NULL REFERENCES "codelens_runs"("id") ON DELETE CASCADE,
  "file_path"        varchar(1000) NOT NULL,
  "file_name"        varchar(255) NOT NULL,
  "file_type"        varchar(50),
  "standards_checked" integer DEFAULT 0,
  "critical_count"   integer DEFAULT 0,
  "warning_count"    integer DEFAULT 0,
  "info_count"       integer DEFAULT 0,
  "pass_count"       integer DEFAULT 0,
  "na_count"         integer DEFAULT 0,
  "applicable_cells" integer DEFAULT 0,
  "verified_cells"   integer DEFAULT 0,
  "compliance_pct"   numeric(5,2) DEFAULT 0,
  "status"           varchar(10)
);
ALTER TABLE "codelens_file_results" ADD COLUMN IF NOT EXISTS "applicable_cells" integer DEFAULT 0;
ALTER TABLE "codelens_file_results" ADD COLUMN IF NOT EXISTS "verified_cells"   integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS "codelens_standard_results" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id"         uuid NOT NULL REFERENCES "codelens_runs"("id") ON DELETE CASCADE,
  "file_result_id" uuid NOT NULL REFERENCES "codelens_file_results"("id") ON DELETE CASCADE,
  "file_path"      varchar(1000) NOT NULL,
  "standard_id"    varchar(10) NOT NULL,
  "standard_name"  varchar(200) NOT NULL,
  "severity"       varchar(20) NOT NULL,
  "status"         varchar(20) NOT NULL,
  "checked"        text,
  "created_at"     timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "codelens_violations" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id"         uuid NOT NULL REFERENCES "codelens_runs"("id") ON DELETE CASCADE,
  "file_result_id" uuid NOT NULL REFERENCES "codelens_file_results"("id") ON DELETE CASCADE,
  "violation_id"   varchar(100) NOT NULL,
  "file_path"      varchar(1000) NOT NULL,
  "file_name"      varchar(255) NOT NULL,
  "standard_id"    varchar(10) NOT NULL,
  "standard_name"  varchar(200) NOT NULL,
  "severity"       varchar(20) NOT NULL,
  "line_start"     integer,
  "line_end"       integer,
  "found_code"     text,
  "explanation"    text,
  "fix_suggestion" text,
  "status"         varchar(20) DEFAULT 'OPEN',
  "fixed_at"       timestamp,
  "fixed_commit"   varchar(40),
  "created_at"     timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_codelens_runs_repo"
  ON "codelens_runs"("repo_url", "branch", "started_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_codelens_file_results_run"
  ON "codelens_file_results"("run_id");
CREATE INDEX IF NOT EXISTS "idx_codelens_standard_results_run"
  ON "codelens_standard_results"("run_id");
CREATE INDEX IF NOT EXISTS "idx_codelens_violations_run"
  ON "codelens_violations"("run_id", "severity");
CREATE INDEX IF NOT EXISTS "idx_codelens_violations_compare"
  ON "codelens_violations"("run_id", "file_path", "standard_id", "line_start");

-- ── Content-hash verdict cache (0006) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "codelens_check_cache" (
  "cache_key"        varchar(64) PRIMARY KEY,
  "standard_id"      varchar(10) NOT NULL,
  "status"           varchar(20) NOT NULL,
  "checked"          text,
  "violations"       jsonb,
  "checker_version"  varchar(80) NOT NULL,
  "created_at"       timestamp DEFAULT now(),
  "last_hit_at"      timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_codelens_check_cache_standard"
  ON "codelens_check_cache"("standard_id");

-- ── Sticky suppressions (per-user) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "codelens_suppressions" (
  "supp_key"    varchar(64) PRIMARY KEY,
  "user_id"     varchar(64),
  "repo_url"    varchar(500) NOT NULL,
  "file_path"   varchar(1000) NOT NULL,
  "standard_id" varchar(10) NOT NULL,
  "status"      varchar(20) NOT NULL,
  "created_at"  timestamp DEFAULT now()
);
ALTER TABLE "codelens_suppressions" ADD COLUMN IF NOT EXISTS "user_id" varchar(64);
CREATE INDEX IF NOT EXISTS "idx_codelens_suppressions_repo"
  ON "codelens_suppressions"("repo_url");

-- ── Custom (user-defined) standards (per-user) ───────────────────────────────
CREATE TABLE IF NOT EXISTS "codelens_custom_standards" (
  "id"                  varchar(20) PRIMARY KEY,
  "user_id"             varchar(64),
  "name"                varchar(200) NOT NULL,
  "severity"            varchar(20) NOT NULL,
  "description"         text NOT NULL,
  "what_to_look_for"    text NOT NULL,
  "applies_to"          varchar(20) NOT NULL,
  "not_applicable_when" text NOT NULL DEFAULT '',
  "enabled"             boolean NOT NULL DEFAULT true,
  "created_at"          timestamp DEFAULT now(),
  "updated_at"          timestamp DEFAULT now()
);
ALTER TABLE "codelens_custom_standards" ADD COLUMN IF NOT EXISTS "user_id" varchar(64);
