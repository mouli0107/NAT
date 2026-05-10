-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0004: Drop FK constraints on framework_assets created_by / updated_by
--
-- These columns store recorder labels ("recorder", "e2e-test"), NOT user IDs.
-- The FK was mistakenly added in 0002; removing it lets free-form values through.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE framework_assets DROP CONSTRAINT IF EXISTS framework_assets_created_by_fkey;
ALTER TABLE framework_assets DROP CONSTRAINT IF EXISTS framework_assets_updated_by_fkey;
ALTER TABLE framework_assets DROP CONSTRAINT IF EXISTS framework_assets_source_tc_id_fkey;

-- Also drop any stale FK constraints on asset_conflicts author/tcId columns
-- that may have been created by earlier schema pushes.
ALTER TABLE asset_conflicts DROP CONSTRAINT IF EXISTS asset_conflicts_base_author_fkey;
ALTER TABLE asset_conflicts DROP CONSTRAINT IF EXISTS asset_conflicts_incoming_author_fkey;
ALTER TABLE asset_conflicts DROP CONSTRAINT IF EXISTS asset_conflicts_base_tc_id_fkey;
ALTER TABLE asset_conflicts DROP CONSTRAINT IF EXISTS asset_conflicts_incoming_tc_id_fkey;
ALTER TABLE asset_conflicts DROP CONSTRAINT IF EXISTS asset_conflicts_resolved_by_fkey;
