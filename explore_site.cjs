/**
 * Uses Playwright's own Chromium (unmanaged) to explore
 * https://apolf-web-preprod.azurewebsites.net/RedikerAcademy
 * and take screenshots + extract page structure for automation planning.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://apolf-web-preprod.azurewebsites.net/RedikerAcademy';
const OUT_DIR  = path.join(__dirname, 'site_explore');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

(async () => {
  console.log('Launching Playwright Chromium...');
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120'
  });
  const page = await context.newPage();

  // ── Step 1: Navigate to root ─────────────────────────────────────────────
  console.log('\n[1] Navigating to', BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  console.log('    Final URL:', page.url());
  console.log('    Title    :', await page.title());

  await page.screenshot({ path: path.join(OUT_DIR, '01_initial_page.png'), fullPage: true });
  console.log('    Screenshot: 01_initial_page.png');

  // ── Step 2: Analyse page structure ───────────────────────────────────────
  const structure = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input')).map(el => ({
      type: el.type, name: el.name, id: el.id,
      placeholder: el.placeholder, label: (() => {
        const lbl = document.querySelector(`label[for="${el.id}"]`);
        return lbl ? lbl.textContent.trim() : null;
      })()
    }));
    const buttons = Array.from(document.querySelectorAll('button, input[type=submit], a.btn, .btn'))
      .map(el => ({ tag: el.tagName, text: el.textContent.trim().substring(0, 60), type: el.type || '' }));
    const links = Array.from(document.querySelectorAll('a'))
      .filter(a => a.href && !a.href.startsWith('javascript'))
      .map(a => ({ text: a.textContent.trim().substring(0, 40), href: a.href }))
      .slice(0, 20);
    const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
      .map(h => h.textContent.trim());
    return { inputs, buttons, links, headings, url: window.location.href, title: document.title };
  });

  console.log('\n── PAGE STRUCTURE ──────────────────────────────────────');
  console.log('URL    :', structure.url);
  console.log('Title  :', structure.title);
  console.log('Headings:', structure.headings);
  console.log('\nInputs:');
  structure.inputs.forEach(i => console.log(' ', JSON.stringify(i)));
  console.log('\nButtons:');
  structure.buttons.forEach(b => console.log(' ', JSON.stringify(b)));
  console.log('\nLinks:');
  structure.links.forEach(l => console.log(' ', JSON.stringify(l)));

  // Save structure to JSON
  fs.writeFileSync(path.join(OUT_DIR, 'page_structure.json'), JSON.stringify(structure, null, 2));
  console.log('\nStructure saved to site_explore/page_structure.json');

  // ── Step 3: Check if it's a login page ───────────────────────────────────
  const hasPasswordField = structure.inputs.some(i => i.type === 'password');
  const isLoginPage = hasPasswordField || /login|sign.?in/i.test(structure.title);
  console.log('\nIs login page:', isLoginPage);

  if (!isLoginPage) {
    // Try navigating to common login paths
    const loginPaths = [
      '/RedikerAcademy/Account/Login',
      '/RedikerAcademy/Login',
    ];
    for (const lp of loginPaths) {
      console.log('\nTrying login path:', lp);
      try {
        await page.goto('https://apolf-web-preprod.azurewebsites.net' + lp,
          { waitUntil: 'networkidle', timeout: 15000 });
        console.log('  URL:', page.url(), '| Title:', await page.title());
        await page.screenshot({ path: path.join(OUT_DIR, 'login_attempt.png'), fullPage: true });
        break;
      } catch(e) { console.log('  Failed:', e.message); }
    }
  }

  console.log('\n⏸  Browser will stay open for 60 seconds for manual inspection...');
  console.log('   You can interact with the browser manually.');
  await page.waitForTimeout(60000);

  await browser.close();
  console.log('Done.');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
