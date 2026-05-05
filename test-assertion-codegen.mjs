/**
 * Tests the assertion code-generation pipeline end-to-end.
 * Simulates recording steps that include assertion steps,
 * then calls generateFramework and shows the generated files.
 */
import { generateFramework } from './server/script-writer-agent.js';
import { nlAssertionToCode, buildVerifyFunction } from './server/script-writer-agent.js';

const START_URL = 'https://www.onespan.com';
const TEST_NAME  = 'OneSpan Homepage Verification';

// Simulated NL steps — mix of interactions + assertions (as recorded via "Add Assert")
const NL_STEPS = [
  'Step 1: Navigate to https://www.onespan.com/',
  'Step 2: Click button "Close"',
  'Step 3: Assert "Products" is visible',
  'Step 4: Assert "Request demo" is enabled',
  'Step 5: Assert text contains "High-assurance authentication" on "hero heading"',
  'Step 6: Assert text contains "Faster digital agreements" on "subheading"',
  'Step 7: Assert "Digital agreements" is visible',
  'Step 8: Assert "Cybersecurity" is visible',
  'Step 9: Assert "Products" is visible [soft]',
];

console.log('═══ Unit test: nlAssertionToCode ═══\n');

const testCases = [
  'Step 3: Assert "Products" is visible',
  'Step 4: Assert "Request demo" is enabled',
  'Step 5: Assert text contains "High-assurance authentication" on "hero heading"',
  'Step 7: Assert "Digital agreements" is visible',
  'Step 9: Assert "Products" is visible [soft]',
  'Step X: Assert value equals "john@test.com" on "Email"',
  'Step X: Assert "Submit" is disabled',
  'Step X: Assert "Remember me" is checked',
  'Step X: Assert attribute "href" contains "/products" on "Products link"',
  'Step X: Assert 3 elements match "nav item"',
];

for (const tc of testCases) {
  const { code, isSoft } = nlAssertionToCode(tc);
  console.log(`INPUT:  ${tc.replace(/^Step \w+:\s*/, '')}`);
  console.log(`OUTPUT: ${code}${isSoft ? '  ← SOFT' : ''}`);
  console.log();
}

console.log('\n═══ Unit test: buildVerifyFunction ═══\n');
const verifyFn = buildVerifyFunction('onespan', NL_STEPS);
console.log(verifyFn);

console.log('\n═══ Full framework generation (includes assertion steps) ═══\n');
console.log('NL Steps passed to generator:');
NL_STEPS.forEach(s => console.log(' ', s));
console.log();

const EVENTS = NL_STEPS.map((nl, i) => ({
  sequence: i + 1,
  type: i === 0 ? 'page_load' : /^Step \d+: Assert/i.test(nl) ? 'assertion' : 'interaction',
  url: START_URL,
  naturalLanguage: nl,
}));

const generatedFiles = {};
for await (const event of generateFramework(NL_STEPS, START_URL, TEST_NAME, EVENTS)) {
  if (event.type === 'status') {
    console.log(' ', event.message);
  } else if (event.type === 'error') {
    console.error('\n❌ ERROR:', event.message);
    process.exit(1);
  } else if (event.type === 'file') {
    generatedFiles[event.file.path] = event.file.content;
    console.log(`  ✅ ${event.file.path}`);
  }
}

// Show the business actions file — verify function should be there
console.log('\n═══ actions/business/onespan.actions.ts (assertion section) ═══\n');
const actionsFile = Object.entries(generatedFiles).find(([p]) => p.includes('.actions.ts'));
if (actionsFile) {
  const lines = actionsFile[1].split('\n');
  // Show only the verify function section
  const startIdx = lines.findIndex(l => l.includes('export async function verify'));
  if (startIdx >= 0) {
    console.log(lines.slice(startIdx).join('\n'));
  } else {
    console.log('⚠️  No verify function found!');
  }
}

// Show test spec — should call verifyOnespan()
console.log('\n═══ tests/*.spec.ts ═══\n');
const testFile = Object.entries(generatedFiles).find(([p]) => p.includes('.spec.ts'));
if (testFile) {
  console.log(testFile[1]);
}
