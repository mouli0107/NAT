import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: 'postgresql://postgres:Mouli%401978@localhost:5432/nat20' });

const res = await pool.query(`
  SELECT t.table_name,
         (SELECT COUNT(*) FROM information_schema.columns c
          WHERE c.table_name = t.table_name AND c.table_schema = 'public')::int AS col_count
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name
`);

console.log(`\nLocal database: nat20 — ${res.rows.length} tables\n`);
for (const row of res.rows) {
  // Count actual rows
  const countRes = await pool.query(`SELECT COUNT(*)::int AS n FROM "${row.table_name}"`);
  const n = countRes.rows[0].n;
  console.log(`  ${row.table_name.padEnd(35)} ${String(n).padStart(5)} rows`);
}

await pool.end();
