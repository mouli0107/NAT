-- ─────────────────────────────────────────────────────────────────────────────
-- NAT 2.0 — Sprint 1: Test Library Hierarchy Schema
-- Migration: 0002_test_library_hierarchy.sql
--
-- NOTE: All IDs use varchar (not UUID type) to match the existing schema
-- convention where gen_random_uuid() is the DEFAULT but the column type is
-- varchar.  This is consistent with every other table in this database.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Project membership ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_members (
  id          varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  project_id  varchar NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        varchar(20) DEFAULT 'member',
  joined_at   timestamp DEFAULT now(),
  CONSTRAINT project_members_project_user_unique UNIQUE(project_id, user_id)
);

-- ── Module level ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS modules (
  id          varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  project_id  varchar NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        varchar(255) NOT NULL,
  description text,
  created_by  varchar REFERENCES users(id),
  created_at  timestamp DEFAULT now(),
  CONSTRAINT modules_project_name_unique UNIQUE(project_id, name)
);

-- ── Feature level ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS features (
  id          varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  module_id   varchar NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  name        varchar(255) NOT NULL,
  created_by  varchar REFERENCES users(id),
  created_at  timestamp DEFAULT now(),
  CONSTRAINT features_module_name_unique UNIQUE(module_id, name)
);

-- ── Extend test_cases (additive only) ─────────────────────────────────────────
-- NOTE: test_cases.status already exists as TEXT DEFAULT 'pending'
--       IF NOT EXISTS makes that ALTER a safe no-op.
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS module_id          varchar REFERENCES modules(id);
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS feature_id         varchar REFERENCES features(id);
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS recorded_by        varchar REFERENCES users(id);
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS tc_sequence        integer;
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS status             varchar(20) DEFAULT 'recorded';
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS recording_locked_by varchar REFERENCES users(id);
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS recording_locked_at timestamp;

-- ── Framework asset store (single source of truth) ────────────────────────────
CREATE TABLE IF NOT EXISTS framework_assets (
  id            varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  project_id    varchar NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_type    varchar(50) NOT NULL,
  asset_key     varchar(500) NOT NULL,
  file_path     varchar(500) NOT NULL,
  content       text NOT NULL,
  content_hash  varchar(64),
  unit_name     varchar(255),
  unit_hash     varchar(64),
  layer         varchar(50),
  created_by    varchar REFERENCES users(id),
  updated_by    varchar REFERENCES users(id),
  created_at    timestamp DEFAULT now(),
  updated_at    timestamp DEFAULT now(),
  source_tc_id  varchar REFERENCES test_cases(id),
  CONSTRAINT fa_project_type_key_unique UNIQUE(project_id, asset_type, asset_key)
);

-- ── Version history ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asset_versions (
  id           varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  asset_id     varchar NOT NULL REFERENCES framework_assets(id) ON DELETE CASCADE,
  version_num  integer NOT NULL,
  content      text NOT NULL,
  content_hash varchar(64),
  changed_by   varchar REFERENCES users(id),
  changed_at   timestamp DEFAULT now(),
  change_type  varchar(20),
  change_note  text
);

-- ── Conflict tracking ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asset_conflicts (
  id               varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  project_id       varchar NOT NULL REFERENCES projects(id),
  asset_type       varchar(50) NOT NULL,
  asset_key        varchar(500) NOT NULL,
  conflict_type    varchar(50),
  base_content     text,
  incoming_content text,
  base_author      varchar REFERENCES users(id),
  incoming_author  varchar REFERENCES users(id),
  base_tc_id       varchar REFERENCES test_cases(id),
  incoming_tc_id   varchar REFERENCES test_cases(id),
  ai_suggestion    text,
  status           varchar(20) DEFAULT 'open',
  created_at       timestamp DEFAULT now(),
  resolved_at      timestamp,
  resolved_by      varchar REFERENCES users(id)
);

-- ── Deduplication log ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deduplication_log (
  id                varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  project_id        varchar NOT NULL REFERENCES projects(id),
  dedup_type        varchar(50),
  canonical_key     varchar(500),
  removed_keys      text[],
  references_updated integer DEFAULT 0,
  performed_by      varchar(20) DEFAULT 'auto',
  performed_at      timestamp DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fa_project      ON framework_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_fa_type         ON framework_assets(project_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_fa_file         ON framework_assets(project_id, file_path);
CREATE INDEX IF NOT EXISTS idx_fa_unit_hash    ON framework_assets(project_id, unit_hash);
CREATE INDEX IF NOT EXISTS idx_ac_project      ON asset_conflicts(project_id, status);
CREATE INDEX IF NOT EXISTS idx_modules_project ON modules(project_id);
CREATE INDEX IF NOT EXISTS idx_features_module ON features(module_id);
CREATE INDEX IF NOT EXISTS idx_tc_module       ON test_cases(module_id);
CREATE INDEX IF NOT EXISTS idx_tc_feature      ON test_cases(feature_id);
CREATE INDEX IF NOT EXISTS idx_pm_project      ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_user         ON project_members(user_id);
