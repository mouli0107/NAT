/**
 * Explores the Apply Now flow on AdminPlus Online Forms / Rediker Academy
 * Captures screenshots + page structure at each step.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://apolf-web-preprod.azurewebsites.net/RedikerAcademy';
const OUT_DIR  = path.join(__dirname, 'site_explore');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

async function snapshot(page, name) {
  const file = path.join(OUT_DIR, name + '.png');
  await page.screenshot({ path: file, fullPage: true });
  const struct = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input:not([type=hidden])'))
      .map(el => ({
        type: el.type, name: el.name, id: el.id,
        placeholder: el.placeholder,
        label: (() => {
          const lbl = document.querySelector(`label[for="${el.id}"]`);
          return lbl ? lbl.textContent.trim() : null;
        })(),
        required: el.required
      }));
    const selects = Array.from(document.querySelectorAll('select'))
      .map(el => ({ name: el.name, id: el.id, options: Array.from(el.options).map(o => o.text).slice(0, 5) }));
    const buttons = Array.from(document.querySelectorAll('button, input[type=submit]'))
      .map(el => ({ text: el.textContent.trim() || el.value, type: el.type }));
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4'))
      .map(h => h.textContent.trim()).filter(Boolean);
    const labels = Array.from(document.querySelectorAll('label'))
      .map(l => l.textContent.trim()).filter(Boolean);
    return { url: window.location.href, title: document.title, headings, inputs, selects, buttons, labels };
  });
  console.log(`\n📸 ${name}.png  →  ${struct.url}`);
  console.log(`   Title   : ${struct.title}`);
  console.log(`   Headings: ${struct.headings.join(' | ')}`);
  console.log(`   Inputs  : ${struct.inputs.map(i => `[${i.type}] ${i.label || i.placeholder || i.name}`).join(', ')}`);
  console.log(`   Selects : ${struct.selects.map(s => s.name).join(', ')}`);
  console.log(`   Buttons : ${struct.buttons.map(b => b.text).join(' | ')}`);
  fs.writeFileSync(path.join(OUT_DIR, name + '.json'), JSON.stringify(struct, null, 2));
  return struct;
}

(async () => {
  console.log('Launching Playwright Chromium (headed)...\n');
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // ── 1. Login Page ────────────────────────────────────────────────────────
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  const s1 = await snapshot(page, '01_login_page');

  // ── 2. Click "Apply Now" ─────────────────────────────────────────────────
  console.log('\n[→] Clicking "Apply Now"...');
  try {
    await page.click('text=Apply Now', { timeout: 5000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch(e) {
    // Try alternate selectors
    try {
      await page.click('button:has-text("Apply")', { timeout: 3000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch(e2) {
      console.log('   Could not find Apply Now button, trying direct nav...');
      await page.goto(BASE_URL + '/Apply', { waitUntil: 'networkidle', timeout: 15000 });
    }
  }
  const s2 = await snapshot(page, '02_after_apply_click');

  // ── 3. Walk through subsequent steps ─────────────────────────────────────
  // Look for Next/Continue buttons up to 5 steps
  for (let step = 3; step <= 7; step++) {
    const nextBtn = await page.$('button:has-text("Next"), button:has-text("Continue"), input[value="Next"]');
    const saveBtn = await page.$('button:has-text("Save"), button:has-text("Submit")');
    if (!nextBtn && !saveBtn) break;

    if (nextBtn) {
      const btnText = await nextBtn.textContent();
      console.log(`\n[→] Clicking "${btnText?.trim()}"...`);
      await nextBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);
      await snapshot(page, `0${step}_step`);
    } else break;
  }

  // ── 4. Also check the "Forgot Password" flow ────────────────────────────
  console.log('\n[→] Navigating back to check Forgot Password...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 });
  try {
    await page.click('text=Forgot your password', { timeout: 5000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await snapshot(page, '08_forgot_password');
  } catch(e) { console.log('   Forgot password link not found'); }

  // ── Summary ───────────────────────────────────────────────────────────────
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.json'));
  console.log('\n\n════════════════════════════════════════════════════════');
  console.log('EXPLORATION COMPLETE');
  console.log('════════════════════════════════════════════════════════');
  console.log(`Screenshots + JSON saved to: ${OUT_DIR}`);
  console.log(`Pages discovered: ${files.length}`);
  files.forEach(f => {
    const data = JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8'));
    console.log(`  • ${f.replace('.json','')}  →  ${data.url}`);
    console.log(`    Inputs: ${data.inputs?.length || 0}  Buttons: ${data.buttons?.length || 0}`);
  });

  console.log('\n⏸  Keeping browser open for 30s for manual inspection...');
  await page.waitForTimeout(30000);
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
