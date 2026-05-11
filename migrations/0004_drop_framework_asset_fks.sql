-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0004: Drop FK constraints on user-reference columns in framework tables
--
-- created_by / updated_by / changed_by store free-form recorder labels,
-- NOT user IDs. The FKs to users.id block every insert from the merger engine.
-- ─────────────────────────────────────────────────────────────────────────────

-- framework_assets
ALTER TABLE framework_assets DROP CONSTRAINT IF EXISTS framework_assets_created_by_fkey;
ALTER TABLE framework_assets DROP CONSTRAINT IF EXISTS framework_assets_updated_by_fkey;
ALTER TABLE framework_assets DROP CONSTRAINT IF EXISTS framework_assets_source_tc_id_fkey;

-- asset_versions
ALTER TABLE asset_versions DROP CONSTRAINT IF EXISTS asset_versions_changed_by_fkey;

-- asset_conflicts
ALTER TABLE asset_conflicts DROP CONSTRAINT IF EXISTS asset_conflicts_base_author_fkey;
ALTER TABLE asset_conflicts DROP CONSTRAINT IF EXISTS asset_conflicts_incoming_author_fkey;
ALTER TABLE asset_conflicts DROP CONSTRAINT IF EXISTS asset_conflicts_base_tc_id_fkey;
ALTER TABLE asset_conflicts DROP CONSTRAINT IF EXISTS asset_conflicts_incoming_tc_id_fkey;
ALTER TABLE asset_conflicts DROP CONSTRAINT IF EXISTS asset_conflicts_resolved_by_fkey;

-- modules / features
ALTER TABLE modules  DROP CONSTRAINT IF EXISTS modules_created_by_fkey;
ALTER TABLE features DROP CONSTRAINT IF EXISTS features_created_by_fkey;
