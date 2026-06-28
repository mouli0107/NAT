-- ASTRA Code Lens: content-hash cache of per-(file, standard) verdicts.
-- Apply with: npx tsx scripts/apply-codelens-cache-migration.ts

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
