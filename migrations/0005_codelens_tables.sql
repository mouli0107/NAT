-- ASTRA Code Lens: persistent run storage
-- Apply with: psql $DATABASE_URL -f migrations/0005_codelens_tables.sql

CREATE TABLE IF NOT EXISTS "codelens_runs" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  "compliance_pct"   numeric(5,2) DEFAULT 0,
  "status"           varchar(10)
);

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
