// Quick local test of the TS patterns against the real framework methods
const TS_PATTERNS = [
  { re: /export\s+(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(([^)]*)\)\s*(?::\s*([A-Za-z_$][A-Za-z0-9_$<>\[\]|&\s,]*?))?\s*[{]/, n:1,p:2,r:3 },
  { re: /export\s+const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*([A-Za-z_$][A-Za-z0-9_$<>\[\]|&\s,]*?))?\s*=>/, n:1,p:2,r:3 },
  { re: /(?:public|protected)\s+(?:async\s+)?(?:static\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\(([^)]*)\)\s*(?::\s*([A-Za-z_$][A-Za-z0-9_$<>\[\]|&\s,]*?))?\s*[{]/, n:1,p:2,r:3 },
  { re: /^\s+(?:async\s+)([A-Za-z_$][A-Za-z0-9_$]*)\s*\(([^)]*)\)\s*(?::\s*([A-Za-z_$][A-Za-z0-9_$<>\[\]|&\s,]*?))?\s*\{/, n:1,p:2,r:3 },
  { re: /^\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(([^)]*)\)\s*:\s*([A-Za-z_$][A-Za-z0-9_$<>\[\]|&\s,]*?)\s*\{/, n:1,p:2,r:3 },
  { re: /^(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(([^)]*)\)\s*(?::\s*([A-Za-z_$][A-Za-z0-9_$<>\[\]|&\s,]*?))?\s*[{]/, n:1,p:2,r:3 },
];

const testLines = [
  "    async navigateToHomePageGuest(): Promise<void> {",
  "    async navigateToHomePageUser(): Promise<void> {",
  "    async logIn(email: string, password: string): Promise<void> {",
  "    async logOut(): Promise<void> {",
  "    async publishArticle(title: string, description: string, body: string, tags?: string): Promise<void> {",
  "    async verifyUserIsLoggedIn(userName: string): Promise<void> {",
  "    async deleteArticle(): Promise<void> {",
  "  constructor(page: Page) {",  // should NOT match (skip)
];

const SKIP = new Set(["constructor","toString","hashCode","equals"]);

for (const line of testLines) {
  let matched = false;
  for (const pat of TS_PATTERNS) {
    const m = pat.re.exec(line);
    if (m) {
      const name = m[pat.n]?.trim();
      if (!name || SKIP.has(name)) break;
      const params = m[pat.p] ?? '';
      const ret = m[pat.r] ?? 'void';
      console.log(`✅ MATCHED: ${name}(${params.trim()}): ${ret.trim()}`);
      matched = true;
      break;
    }
  }
  if (!matched) console.log(`❌ NO MATCH: ${line.trim()}`);
}
