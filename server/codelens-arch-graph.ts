// ─── Architecture / dependency graph (deterministic, no LLM) ──────────────────
//
// Builds a layered architecture overview (Controller → Service → Repository → DB)
// and the dependency edges between classes, by static analysis of the cloned C#
// source. Edges come from dependency injection — constructor parameters, primary
// constructor parameters, and `private readonly` fields — resolved through
// interface→implementation mapping.
//
// This is a best-effort VISUALISATION (regex-based, not a compiler), so it favours
// recall and never blocks a review. Illegal edges (layer-skips and reverse
// dependencies) are flagged and tied to the matching architecture standard so the
// graph doubles as a compliance view.

export type ArchLayer = 'controller' | 'service' | 'repository' | 'data' | 'other';

export interface ArchNode {
  id: string;        // mermaid-safe id (n0, n1, …)
  label: string;     // class name
  layer: ArchLayer;
  file: string;      // relative path
}

export interface ArchEdge {
  from: string;          // node id
  to: string;            // node id
  viaInterface?: string; // the injected interface, when resolved through one
  illegal?: boolean;
  reason?: string;
  standardId?: string;
}

export interface ArchViolation {
  from: string;       // class name
  to: string;         // class name
  reason: string;
  standardId: string;
}

export interface ArchitectureGraph {
  nodes: ArchNode[];
  edges: ArchEdge[];
  violations: ArchViolation[];
  mermaid: string;
  stats: {
    controllers: number;
    services: number;
    repositories: number;
    dataAccess: number;
    edges: number;
    illegalEdges: number;
    filesAnalyzed: number;
    truncated: boolean;
  };
}

const LAYER_RANK: Record<ArchLayer, number> = {
  controller: 1, service: 2, repository: 3, data: 4, other: 0,
};

// Framework / infrastructure types that are dependencies but NOT architecture nodes.
const FRAMEWORK_TYPES = new Set([
  'ILogger', 'ILoggerFactory', 'IConfiguration', 'IOptions', 'IOptionsMonitor',
  'IMapper', 'IMediator', 'IServiceProvider', 'IServiceScopeFactory',
  'IHttpContextAccessor', 'IHttpClientFactory', 'HttpClient', 'CancellationToken',
  'IApplicationIdentity', 'IMemoryCache', 'IDistributedCache', 'IWebHostEnvironment',
  'IHostEnvironment', 'IValidator', 'IDaprClient', 'DaprClient',
]);

interface ParsedClass {
  name: string;
  layer: ArchLayer;
  file: string;
  interfaces: string[];   // interfaces this class implements
  deps: string[];         // dependency type names (base identifier, generics stripped)
  usesDbContext: boolean;
}

/** Strip generics + array/nullable markers, return the base type identifier. */
function baseType(t: string): string {
  return (t || '').replace(/<.*$/, '').replace(/[\[\]?]/g, '').trim();
}

/** Split a parameter/base list on commas while respecting <…> and (…) nesting. */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '<' || ch === '(') depth++;
    else if (ch === '>' || ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/** Is this dependency type an architecturally interesting (project) type? */
function isProjectDep(typeName: string): boolean {
  const t = baseType(typeName);
  if (!t || FRAMEWORK_TYPES.has(t)) return false;
  if (/^(string|int|long|bool|decimal|double|float|Guid|DateTime|object|byte|var|void|Task|List|IEnumerable|IList|ICollection|Dictionary)$/.test(t)) return false;
  // Interfaces (IFoo) or types that look like wired components.
  if (/^I[A-Z]/.test(t)) return true;
  return /(Service|Repository|Handler|Manager|Store|Provider|Gateway|Client|Context|UnitOfWork|Factory)$/.test(t);
}

function classifyLayer(className: string, baseList: string[], filePath: string, content: string): ArchLayer {
  const lower = filePath.toLowerCase();
  const n = className;
  if (/Controller$/.test(n) || baseList.some(b => /Controller$/.test(baseType(b)))) return 'controller';
  if (/Repository$/.test(n)) return 'repository';
  if (/(Service|Handler)$/.test(n)) return 'service';
  if (/DbContext$/.test(n) || baseList.some(b => /DbContext$/.test(baseType(b)))) return 'data';
  if (lower.includes('/repositor') || lower.includes('\\repositor')) return 'repository';
  if (/:\s*DbContext|DbSet</.test(content)) return 'data';
  return 'other';
}

/** Extract the dependency types injected into a class (ctor params, primary
 *  ctor params, private readonly fields). `body` is the slice of source for the class. */
function extractDeps(className: string, primaryCtorParams: string, body: string): string[] {
  const deps = new Set<string>();

  const addParams = (paramStr: string) => {
    for (const p of splitTopLevel(paramStr)) {
      const m = p.trim().match(/^(?:\[[^\]]*\]\s*)*(?:in|out|ref|params|readonly)?\s*([A-Za-z_][\w.]*(?:<[^>]*>)?)\s+\w+/);
      if (m && isProjectDep(m[1])) deps.add(baseType(m[1]));
    }
  };

  if (primaryCtorParams) addParams(primaryCtorParams);

  // Classic constructor: public ClassName( ... )
  const ctorRe = new RegExp(`(?:public|internal|protected)\\s+${className}\\s*\\(([^)]*)\\)`, 'g');
  let m: RegExpExecArray | null;
  while ((m = ctorRe.exec(body)) !== null) addParams(m[1]);

  // private readonly <Type> _field;
  const fieldRe = /(?:private|protected|internal)\s+readonly\s+([A-Za-z_][\w.]*(?:<[^>]*>)?)\s+\w+\s*;/g;
  while ((m = fieldRe.exec(body)) !== null) {
    if (isProjectDep(m[1])) deps.add(baseType(m[1]));
  }

  return Array.from(deps);
}

function parseFile(filePath: string, content: string): ParsedClass[] {
  const classes: ParsedClass[] = [];
  // class Name<T> [(primaryCtorParams)] [: Base, IFoo, IBar]
  const classRe = /\bclass\s+([A-Z]\w*)\s*(?:<[^>]*>)?\s*(?:\(([^)]*)\))?\s*(?::\s*([^\{]+?))?\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = classRe.exec(content)) !== null) {
    const name = m[1];
    const primaryCtor = m[2] ?? '';
    const baseList = (m[3] ?? '').split(',').map(s => baseType(s)).filter(Boolean);
    const interfaces = baseList.filter(b => /^I[A-Z]/.test(b));
    const layer = classifyLayer(name, baseList, filePath, content);
    // Class body slice (from this match to the next class or EOF) for dep scanning.
    const start = m.index;
    classRe.lastIndex = start + m[0].length;
    const nextIdx = content.indexOf('\nclass ', classRe.lastIndex);
    const body = content.slice(start, nextIdx === -1 ? content.length : nextIdx);
    const deps = extractDeps(name, primaryCtor, body);
    const usesDbContext = /:\s*DbContext|DbSet<|\bDbContext\b/.test(body) || deps.some(d => /Context$/.test(d));
    classes.push({ name, layer, file: filePath, interfaces, deps, usesDbContext });
  }
  return classes;
}

const MAX_NODES = 60;

export function buildArchitectureGraph(
  files: { relativePath: string; absolutePath: string }[],
  readFile: (absolutePath: string) => string | null,
): ArchitectureGraph {
  const csFiles = files.filter(f => f.relativePath.toLowerCase().endsWith('.cs'));
  const all: ParsedClass[] = [];
  for (const f of csFiles) {
    const content = readFile(f.absolutePath);
    if (!content) continue;
    try { all.push(...parseFile(f.relativePath, content)); } catch { /* skip unparseable file */ }
  }

  // interface → implementing class
  const implOf = new Map<string, ParsedClass>();
  for (const c of all) for (const iface of c.interfaces) if (!implOf.has(iface)) implOf.set(iface, c);
  const byName = new Map<string, ParsedClass>();
  for (const c of all) if (!byName.has(c.name)) byName.set(c.name, c);

  // Architectural nodes only: classes in a known layer (+ any that use DbContext).
  let arch = all.filter(c => c.layer !== 'other');
  const truncated = arch.length > MAX_NODES;
  if (truncated) {
    const rank = (l: ArchLayer) => LAYER_RANK[l];
    arch = arch.sort((a, b) => rank(a.layer) - rank(b.layer)).slice(0, MAX_NODES);
  }

  const nodeId = new Map<string, string>();
  const nodes: ArchNode[] = [];
  const ensureNode = (c: ParsedClass): string => {
    if (!nodeId.has(c.name)) {
      const id = `n${nodes.length}`;
      nodeId.set(c.name, id);
      nodes.push({ id, label: c.name, layer: c.layer, file: c.file });
    }
    return nodeId.get(c.name)!;
  };
  for (const c of arch) ensureNode(c);

  // Synthetic Database node (target of data-access classes).
  let dbId: string | null = null;
  const ensureDb = (): string => {
    if (!dbId) { dbId = 'db'; nodes.push({ id: dbId, label: 'Database', layer: 'data', file: '' }); }
    return dbId;
  };

  const edges: ArchEdge[] = [];
  const violations: ArchViolation[] = [];
  const seenEdge = new Set<string>();

  const addEdge = (fromC: ParsedClass, toC: ParsedClass, viaInterface?: string) => {
    if (fromC.name === toC.name) return;
    if (!nodeId.has(fromC.name) || !nodeId.has(toC.name)) return;
    const key = `${fromC.name}->${toC.name}`;
    if (seenEdge.has(key)) return;
    seenEdge.add(key);
    const r1 = LAYER_RANK[fromC.layer], r2 = LAYER_RANK[toC.layer];
    let illegal = false, reason: string | undefined, standardId: string | undefined;
    if (r1 > 0 && r2 > 0) {
      if (r2 < r1) { illegal = true; reason = `reverse dependency (${fromC.layer} → ${toC.layer})`; standardId = 'S08'; }
      else if (r2 - r1 > 1) {
        illegal = true;
        reason = `layer skip (${fromC.layer} → ${toC.layer})`;
        standardId = fromC.layer === 'controller' ? 'S08' : 'S19';
      }
    }
    edges.push({ from: nodeId.get(fromC.name)!, to: nodeId.get(toC.name)!, viaInterface, illegal, reason, standardId });
    if (illegal) violations.push({ from: fromC.name, to: toC.name, reason: reason!, standardId: standardId! });
  };

  for (const c of arch) {
    for (const dep of c.deps) {
      const target = implOf.get(dep) ?? byName.get(dep);
      if (target && target.layer !== 'other') {
        ensureNode(target);
        addEdge(c, target, /^I[A-Z]/.test(dep) ? dep : undefined);
      }
    }
    // Repositories / data-access → Database
    if (c.usesDbContext && (c.layer === 'repository' || c.layer === 'data')) {
      const fromId = nodeId.get(c.name)!;
      const k = `${c.name}->__db`;
      if (!seenEdge.has(k)) { seenEdge.add(k); edges.push({ from: fromId, to: ensureDb() }); }
    }
    // Controller/Service touching DbContext directly = layer-skip to data (S02/S19).
    if (c.usesDbContext && (c.layer === 'controller' || c.layer === 'service')) {
      const fromId = nodeId.get(c.name)!;
      const k = `${c.name}->__db`;
      if (!seenEdge.has(k)) {
        seenEdge.add(k);
        const reason = `${c.layer} accesses DbContext directly`;
        edges.push({ from: fromId, to: ensureDb(), illegal: true, reason, standardId: 'S02' });
        violations.push({ from: c.name, to: 'Database', reason, standardId: 'S02' });
      }
    }
  }

  const mermaid = toMermaid(nodes, edges);
  const stats = {
    controllers: nodes.filter(n => n.layer === 'controller').length,
    services: nodes.filter(n => n.layer === 'service').length,
    repositories: nodes.filter(n => n.layer === 'repository').length,
    dataAccess: nodes.filter(n => n.layer === 'data').length,
    edges: edges.length,
    illegalEdges: edges.filter(e => e.illegal).length,
    filesAnalyzed: csFiles.length,
    truncated,
  };
  return { nodes, edges, violations, mermaid, stats };
}

const LAYER_TITLE: Record<ArchLayer, string> = {
  controller: 'Controllers', service: 'Services', repository: 'Repositories', data: 'Data', other: 'Other',
};
const LAYER_ORDER: ArchLayer[] = ['controller', 'service', 'repository', 'data'];

function toMermaid(nodes: ArchNode[], edges: ArchEdge[]): string {
  const lines: string[] = ['flowchart LR'];
  for (const layer of LAYER_ORDER) {
    const group = nodes.filter(n => n.layer === layer);
    if (group.length === 0) continue;
    lines.push(`  subgraph ${LAYER_TITLE[layer]}`);
    for (const n of group) {
      lines.push(n.id === 'db' ? `    ${n.id}[("${n.label}")]` : `    ${n.id}["${n.label}"]`);
    }
    lines.push('  end');
  }
  const illegalIdx: number[] = [];
  edges.forEach((e, i) => {
    if (e.illegal) { lines.push(`  ${e.from} -.->|"⚠ ${e.standardId}"| ${e.to}`); illegalIdx.push(i); }
    else if (e.viaInterface) lines.push(`  ${e.from} -->|"${e.viaInterface}"| ${e.to}`);
    else lines.push(`  ${e.from} --> ${e.to}`);
  });
  illegalIdx.forEach(i => lines.push(`  linkStyle ${i} stroke:#ff4444,stroke-width:2px,color:#ff4444`));
  return lines.join('\n');
}
