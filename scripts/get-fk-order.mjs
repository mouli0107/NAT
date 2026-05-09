// Prints tables in topological (FK-safe) copy order from the local DB
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:Mouli%401978@localhost:5432/nat20' });

const deps = await pool.query(`
  SELECT DISTINCT
    tc.table_name        AS child,
    ccu.table_name       AS parent
  FROM information_schema.table_constraints tc
  JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.constraint_schema
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = rc.unique_constraint_name AND ccu.constraint_schema = rc.unique_constraint_schema
  WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name <> tc.table_name
`);

const allTablesRes = await pool.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_type='BASE TABLE'
`);
const allTables = allTablesRes.rows.map(r => r.table_name);

// Build adjacency: parent → children
const parents = new Map();   // child → [parents]
for (const { child, parent } of deps.rows) {
  if (!parents.has(child)) parents.set(child, new Set());
  parents.get(child).add(parent);
}

// Kahn's topological sort
const inDegree = new Map(allTables.map(t => [t, 0]));
const edges = new Map();   // parent → [children]
for (const [child, pSet] of parents) {
  inDegree.set(child, (inDegree.get(child) || 0) + pSet.size);
  for (const p of pSet) {
    if (!edges.has(p)) edges.set(p, []);
    edges.get(p).push(child);
  }
}

const queue = allTables.filter(t => (inDegree.get(t) || 0) === 0);
const order = [];
while (queue.length) {
  const t = queue.shift();
  order.push(t);
  for (const child of (edges.get(t) || [])) {
    inDegree.set(child, inDegree.get(child) - 1);
    if (inDegree.get(child) === 0) queue.push(child);
  }
}

// Any remaining (cycles — very rare) go at end
const remaining = allTables.filter(t => !order.includes(t));
const finalOrder = [...order, ...remaining];

console.log('\n// Topological copy order (paste into ORDERED_TABLES in migrate-to-azure.mjs)');
console.log('const ORDERED_TABLES = [');
for (const t of finalOrder) console.log(`  '${t}',`);
console.log('];');

await pool.end();
