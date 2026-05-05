/**
 * End-to-end auth flow test — resets DB state before/after
 */
import { db } from './server/db.ts';
import { users } from './shared/schema.ts';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from './server/auth-middleware.ts';

const BASE = 'http://localhost:5000';
const USERNAME = 'chandramouli@nousinfo.com';
const TEST_PWD = 'TestOnly@1111';
const NEW_PWD  = 'TestOnly@2222';

let cookie = '';
let passed = 0;
let failed = 0;

async function req(method: string, path: string, body?: object) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  return { status: res.status, data: await res.json() };
}

function check(label: string, cond: boolean) {
  if (cond) { console.log(`  ✅  ${label}`); passed++; }
  else       { console.log(`  ❌  ${label}`); failed++; }
}

// ── Save original DB state ───────────────────────────────────────────────────
const [orig] = await db.select({ password: users.password, mustChangePassword: users.mustChangePassword })
  .from(users).where(eq(users.username, USERNAME)).limit(1);
if (!orig) { console.error('Admin user not found in DB'); process.exit(1); }

// ── Set known test password ──────────────────────────────────────────────────
await db.update(users)
  .set({ password: hashPassword(TEST_PWD), mustChangePassword: true })
  .where(eq(users.username, USERNAME));
console.log('\n── Auth Flow Tests ─────────────────────────────\n');

// 1. Not logged in
const me1 = await req('GET', '/api/auth/me');
check('GET /api/auth/me → loggedIn: false before login', me1.data.loggedIn === false);

// 2. Wrong password → 401
const bad = await req('POST', '/api/auth/login', { username: USERNAME, password: 'wrongpass' });
check('Login with wrong password → 401', bad.status === 401);

// 3. Unknown user → 401
const unk = await req('POST', '/api/auth/login', { username: 'nobody@test.com', password: TEST_PWD });
check('Login with unknown user → 401', unk.status === 401);

// 4. Correct credentials
cookie = '';
const login = await req('POST', '/api/auth/login', { username: USERNAME, password: TEST_PWD });
check('Login with correct credentials → success', login.data.success === true);
check('Login returns mustChangePassword: true', login.data.mustChangePassword === true);
check('Login returns correct username', login.data.username === USERNAME);

// 5. /api/auth/me reflects session
const me2 = await req('GET', '/api/auth/me');
check('GET /api/auth/me → loggedIn: true after login', me2.data.loggedIn === true);
check('/api/auth/me returns correct username', me2.data.username === USERNAME);

// 6. Change password — same password rejected
const sameP = await req('POST', '/api/auth/change-password', { currentPassword: TEST_PWD, newPassword: TEST_PWD });
check('change-password rejects same password', sameP.status === 400);

// 7. Change password — too short
const shortP = await req('POST', '/api/auth/change-password', { currentPassword: TEST_PWD, newPassword: 'abc' });
check('change-password rejects < 8 chars', shortP.status === 400);

// 8. Change password — success
const change = await req('POST', '/api/auth/change-password', { currentPassword: TEST_PWD, newPassword: NEW_PWD });
check('POST /api/auth/change-password → success', change.data.success === true);

// 9. mustChangePassword flag cleared in DB
const [after] = await db.select({ mustChangePassword: users.mustChangePassword })
  .from(users).where(eq(users.username, USERNAME)).limit(1);
check('mustChangePassword flag cleared in DB', after.mustChangePassword === false);

// 10. Session still valid after password change
const me3 = await req('GET', '/api/auth/me');
check('Session valid after password change', me3.data.loggedIn === true);

// 11. Login with new password
cookie = '';
const login2 = await req('POST', '/api/auth/login', { username: USERNAME, password: NEW_PWD });
check('Login with new password after change → success', login2.data.success === true);
check('mustChangePassword: false on second login', login2.data.mustChangePassword === false);

// 12. Logout
const logout = await req('POST', '/api/auth/logout');
check('POST /api/auth/logout → success', logout.data.success === true);

// 13. Session cleared after logout
const me4 = await req('GET', '/api/auth/me');
check('GET /api/auth/me → loggedIn: false after logout', me4.data.loggedIn === false);

// 14. Old password no longer works after change
cookie = '';
const oldLogin = await req('POST', '/api/auth/login', { username: USERNAME, password: TEST_PWD });
check('Old password rejected after change', oldLogin.status === 401);

// ── Restore original DB state ────────────────────────────────────────────────
await db.update(users)
  .set({ password: orig.password, mustChangePassword: orig.mustChangePassword })
  .where(eq(users.username, USERNAME));
console.log('\n  (DB restored to original state)\n');

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`── Results: ${passed} passed, ${failed} failed ────────────────────\n`);
process.exit(failed > 0 ? 1 : 0);
