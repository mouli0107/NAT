import { minimatch } from 'minimatch';

// ─── Pattern sets ─────────────────────────────────────────────────────────────

/** Default patterns — always ignored unless overridden by ALWAYS_INCLUDE. */
export const DEFAULT_IGNORE_PATTERNS: string[] = [
  // Test projects and files
  '**/*.Tests/**',
  '**/*.Test/**',
  '**/Tests/**',
  '**/UnitTests/**',
  '**/IntegrationTests/**',
  '**/E2ETests/**',
  '**/TestProject/**',
  '**/*.Spec.cs',
  '**/*.Test.cs',
  '**/*.Tests.cs',
  '**/Playwright/**',
  '**/playwright/**',
  '**/test-results/**',
  '**/TestFixtures/**',
  '**/TestHelpers/**',
  '**/TestData/**',
  '**/Mocks/**',
  '**/Fakes/**',
  '**/Stubs/**',
  '**/xunit.runner.json',

  // Build output
  '**/bin/**',
  '**/obj/**',
  '**/.vs/**',
  '**/publish/**',
  '**/out/**',
  '**/artifacts/**',

  // Auto-generated code
  '**/*.Designer.cs',
  '**/*.g.cs',
  '**/*.g.i.cs',
  '**/*.generated.cs',
  '**/GlobalUsings.cs',
  '**/AssemblyInfo.cs',
  '**/*.AssemblyInfo.cs',
  '**/*TemporaryGeneratedFile*',

  // Environment and secrets
  '**/.env',
  '**/.env.*',
  '**/appsettings.Development.json',
  '**/appsettings.Local.json',
  '**/appsettings.Test.json',
  '**/launchSettings.json',
  '**/*.user',
  '**/*.pfx',
  '**/*.key',

  // Package and tooling
  '**/node_modules/**',
  '**/wwwroot/lib/**',
  '**/wwwroot/dist/**',
  '**/.github/**',
  '**/.azuredevops/**',
  '**/coverage/**',
  '**/TestResults/**',
  '**/.sonarqube/**',
  '**/.docker/**',

  // Non-.cs files
  '**/*.md',
  '**/*.txt',
  '**/*.yml',
  '**/*.yaml',
  '**/*.xml',
  '**/*.sln',
  '**/*.sh',
  '**/*.ps1',
  '**/*.cmd',
  '**/*.bat',
  '**/*.scss',
  '**/*.css',
  '**/*.js',
  '**/*.ts',
  '**/*.json',

  // Temporary and IDE files
  '**/.tmp_insp/**',
  '**/.tmp/**',
  '**/tmp/**',
  '**/*.tmp',
  '**/*.bak',
  '**/*.swp',
  '**/check_claims/**',
];

/**
 * Always included regardless of other ignore rules.
 * These specific filenames must always be scanned for the standards that need them.
 */
export const ALWAYS_INCLUDE_PATTERNS: string[] = [
  '**/appsettings.json',   // S40: connection string check
  '**/Program.cs',          // S42: middleware configuration
  '**/*.csproj',            // S07: target framework check
];

/**
 * Always ignored even if the user tries to include them.
 * Security — we never expose secrets or credentials.
 */
export const ALWAYS_IGNORE_PATTERNS: string[] = [
  '**/.env',
  '**/.env.*',
  '**/*.key',
  '**/*.pfx',
  '**/*.p12',
  '**/*.pem',
  '**/*secret*',
  '**/*password*',
  '**/*credential*',
];

// ─── Minimatch options ────────────────────────────────────────────────────────

const MM_OPTS = { dot: true, matchBase: false, nocase: true };

function matchesAnyPattern(filePath: string, patterns: string[]): boolean {
  return patterns.some(p => minimatch(filePath, p, MM_OPTS));
}

// ─── Main decision function ───────────────────────────────────────────────────

/**
 * Returns true if the file should be excluded from scanning.
 * Priority order (highest first):
 *   1. ALWAYS_IGNORE — security, can never be overridden
 *   2. ALWAYS_INCLUDE — specific files that must always be scanned
 *   3. DEFAULT_IGNORE — standard exclusions
 *   4. userIgnorePatterns — caller-supplied extra patterns
 */
export function shouldIgnoreFile(filePath: string, userIgnorePatterns: string[]): boolean {
  const norm = filePath.replace(/\\/g, '/');

  if (matchesAnyPattern(norm, ALWAYS_IGNORE_PATTERNS)) return true;
  if (matchesAnyPattern(norm, ALWAYS_INCLUDE_PATTERNS)) return false;
  if (matchesAnyPattern(norm, DEFAULT_IGNORE_PATTERNS)) return true;
  if (userIgnorePatterns.length > 0 && matchesAnyPattern(norm, userIgnorePatterns)) return true;

  return false;
}

// ─── Parse .codelensignore text ───────────────────────────────────────────────

/** Parse the raw text of a .codelensignore file and return clean pattern array. */
export function parseIgnoreFileContent(content: string): string[] {
  return content
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#'));
}

// ─── Count helpers (for breakdown telemetry) ──────────────────────────────────

export function countMatchingFiles(
  absolutePaths: string[],
  rootDir: string,
  patterns: string[],
): number {
  return absolutePaths.filter(f => {
    const rel = f.replace(/\\/g, '/').replace(rootDir.replace(/\\/g, '/') + '/', '');
    return matchesAnyPattern(rel, patterns);
  }).length;
}
