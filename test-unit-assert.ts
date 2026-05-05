import { nlAssertionToCode, buildVerifyFunction } from './server/script-writer-agent';

const cases = [
  'Step 3: Assert "Products" is visible',
  'Step 4: Assert "Request demo" is enabled',
  'Step 5: Assert text contains "High-assurance authentication" on "hero heading"',
  'Step 6: Assert value equals "john@test.com" on "Email"',
  'Step 7: Assert "Submit" is disabled',
  'Step 8: Assert "Remember me" is checked',
  'Step 9: Assert "Remember me" is unchecked',
  'Step 10: Assert attribute "href" contains "/products" on "Products link"',
  'Step 11: Assert 3 elements match "nav item"',
  'Step 12: Assert "Products" is visible [soft]',
  'Step 13: Assert text equals "Welcome" on "heading"',
  'Step 14: Assert value contains "john" on "Email"',
  'Step 15: Assert "Login" is hidden',
];

console.log('═══ nlAssertionToCode — all patterns ═══\n');
let pass = 0, fail = 0;
for (const c of cases) {
  const { code, isSoft } = nlAssertionToCode(c);
  const ok = !code.startsWith('// TODO');
  const icon = ok ? '✅' : '❌';
  if (ok) pass++; else fail++;
  console.log(`${icon} ${c.replace(/^Step \d+: /, '').padEnd(65)} → ${code}${isSoft ? ' [SOFT]' : ''}`);
}
console.log(`\n${pass}/${cases.length} patterns resolved correctly\n`);

console.log('═══ buildVerifyFunction output ═══\n');
const steps = [
  'Step 1: Navigate to https://www.onespan.com/',
  'Step 2: Click button "Close"',
  ...cases,
];
const fn = buildVerifyFunction('onespan', steps);
console.log(fn);
