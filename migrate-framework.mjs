// One-shot migration: alter framework table columns to match updated schema
import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config();

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
console.log("[Migration] Connected to DB");

// For boolean columns that have an integer default, we must:
// 1. Drop the default
// 2. Alter the type
// 3. Set the new boolean default

const statements = [
  // framework_configs.is_global
  `ALTER TABLE framework_configs ALTER COLUMN is_global DROP DEFAULT`,
  `ALTER TABLE framework_configs ALTER COLUMN is_global TYPE boolean USING (is_global = 1)`,
  `ALTER TABLE framework_configs ALTER COLUMN is_global SET DEFAULT false`,
  // framework_functions.is_custom
  `ALTER TABLE framework_functions ALTER COLUMN is_custom DROP DEFAULT`,
  `ALTER TABLE framework_functions ALTER COLUMN is_custom TYPE boolean USING (is_custom = 1)`,
  `ALTER TABLE framework_functions ALTER COLUMN is_custom SET DEFAULT false`,
  // New columns (idempotent)
  `ALTER TABLE framework_functions ADD COLUMN IF NOT EXISTS class_name text`,
  `ALTER TABLE framework_functions ADD COLUMN IF NOT EXISTS import_path text`,
  `ALTER TABLE framework_files    ADD COLUMN IF NOT EXISTS file_hash  text`,
];

for (const sql of statements) {
  try {
    await client.query(sql);
    console.log("[Migration] OK:", sql.slice(0, 80));
  } catch (err) {
    if (err.message.includes("already exists") || err.message.includes("does not exist")) {
      console.log("[Migration] Skip (already applied):", sql.slice(0, 70));
    } else {
      console.warn("[Migration] WARN:", err.message, "| SQL:", sql.slice(0, 70));
    }
  }
}

await client.end();
console.log("[Migration] Done.");
