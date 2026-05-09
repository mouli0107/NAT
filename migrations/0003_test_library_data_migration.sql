-- ─────────────────────────────────────────────────────────────────────────────
-- NAT 2.0 — Sprint 1: Test Library Data Preservation
-- Migration: 0003_test_library_data_migration.sql
--
-- Runs AFTER 0002_test_library_hierarchy.sql.
-- Idempotent: all inserts use ON CONFLICT DO NOTHING.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Step 1–2: Create default module "General" + feature "Uncategorized" ───────
-- One module per project, one feature under each module.

INSERT INTO modules (id, project_id, name, description, created_by, created_at)
SELECT
  gen_random_uuid(),
  p.id,
  'General',
  'Default module — migrated from legacy storage',
  p.user_id,
  now()
FROM projects p
ON CONFLICT (project_id, name) DO NOTHING;

INSERT INTO features (id, module_id, name, created_by, created_at)
SELECT
  gen_random_uuid(),
  m.id,
  'Uncategorized',
  m.created_by,
  now()
FROM modules m
WHERE m.name = 'General'
ON CONFLICT (module_id, name) DO NOTHING;

-- ── Step 3: Assign existing test_cases to General/Uncategorized ───────────────
-- FK chain: test_cases.workflow_id
--           → workflows.session_id
--           → functional_test_sessions.project_id
--           → modules.project_id / features.module_id

UPDATE test_cases tc
SET
  module_id  = m.id,
  feature_id = f.id
FROM
  workflows                w,
  functional_test_sessions fs,
  modules                  m,
  features                 f
WHERE tc.workflow_id      = w.id
  AND w.session_id        = fs.id
  AND m.project_id        = fs.project_id AND m.name = 'General'
  AND f.module_id         = m.id           AND f.name = 'Uncategorized'
  AND tc.module_id IS NULL;

-- ── Step 4: Set tc_sequence (order by created_at within each project) ─────────
-- Uses a CTE to number test cases per project 1, 2, 3, …

WITH numbered AS (
  SELECT
    tc.id,
    ROW_NUMBER() OVER (
      PARTITION BY fs.project_id
      ORDER BY tc.created_at, tc.id
    ) AS seq
  FROM test_cases tc
  JOIN workflows                w  ON w.id  = tc.workflow_id
  JOIN functional_test_sessions fs ON fs.id = w.session_id
  WHERE fs.project_id IS NOT NULL
)
UPDATE test_cases tc
SET tc_sequence = numbered.seq
FROM numbered
WHERE tc.id = numbered.id
  AND tc.tc_sequence IS NULL;

-- ── Step 5: Set recorded_by from project owner where missing ──────────────────

UPDATE test_cases tc
SET recorded_by = p.user_id
FROM
  workflows                w,
  functional_test_sessions fs,
  projects                 p
WHERE tc.workflow_id  = w.id
  AND w.session_id    = fs.id
  AND fs.project_id   = p.id
  AND tc.recorded_by IS NULL
  AND p.user_id IS NOT NULL;

-- ── Step 6: Add project owner to project_members as 'owner' ──────────────────

INSERT INTO project_members (id, project_id, user_id, role, joined_at)
SELECT
  gen_random_uuid(),
  p.id,
  p.user_id,
  'owner',
  p.created_at
FROM projects p
WHERE p.user_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

-- ── Step 7: Migrate automation_scripts → framework_assets ────────────────────
-- automation_scripts stores DB-side generated scripts with projectId.
-- Filesystem-only files (save-ai-framework route) cannot be migrated from SQL
-- alone — those will be picked up by the Sprint 2 application layer.

INSERT INTO framework_assets (
  id, project_id, asset_type, asset_key, file_path,
  content, content_hash, layer, created_by, updated_by,
  created_at, updated_at, source_tc_id
)
SELECT
  gen_random_uuid(),
  s.project_id,
  CASE
    WHEN s.script_type = 'pom_class'       THEN 'pom'
    WHEN s.script_type = 'bdd_feature'     THEN 'bdd_feature'
    WHEN s.script_type = 'bdd_step_defs'   THEN 'bdd_steps'
    WHEN s.script_type = 'playwright_config' THEN 'config'
    ELSE s.script_type
  END,
  s.file_path,            -- asset_key = file path (unique per project)
  s.file_path,
  s.content,
  -- SHA-256 via pgcrypto would need extension; use MD5 as fallback
  md5(s.content),
  s.script_type,          -- layer
  NULL,                   -- created_by (not stored in automation_scripts)
  NULL,                   -- updated_by
  s.created_at,
  s.updated_at,
  NULL                    -- source_tc_id
FROM automation_scripts s
WHERE s.project_id IS NOT NULL
  AND s.content IS NOT NULL
ON CONFLICT (project_id, asset_type, asset_key) DO NOTHING;

-- ── Step 7b: Insert version_num = 1 for every newly migrated asset ────────────

INSERT INTO asset_versions (
  id, asset_id, version_num, content, content_hash,
  changed_by, changed_at, change_type, change_note
)
SELECT
  gen_random_uuid(),
  fa.id,
  1,
  fa.content,
  fa.content_hash,
  NULL,
  fa.created_at,
  'created',
  'migrated from legacy storage'
FROM framework_assets fa
WHERE NOT EXISTS (
  SELECT 1 FROM asset_versions av WHERE av.asset_id = fa.id
);
