/**
 * REAL end-to-end test of assert mode injection.
 * Opens a real Playwright browser on demoqa.com, injects the exact same
 * code that the server uses, hovers over elements, and takes screenshots
 * proving the amber highlight actually appears on screen.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUT = 'C:/Users/chandramouli/Downloads/Nat20-main/Nat20-main/assert-proof-screenshots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false, slowMo: 300 });
const page    = await browser.newPage();

console.log('1. Navigating to demoqa.com...');
await page.goto('https://demoqa.com/automation-practice-form', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

// Screenshot BEFORE assert mode
await page.screenshot({ path: join(OUT, '1-before-assert.png') });
console.log('   Screenshot 1 saved: before assert mode');

// ── Inject EXACT same code the server uses in page.evaluate ──────────────
console.log('\n2. Injecting assert mode...');
await page.evaluate(() => {
  if (typeof window.__dxqe_assertOff === 'function') window.__dxqe_assertOff();

  function setHL(el) {
    const old = document.getElementById('__dxqe_hl');
    if (old) old.remove();
    if (!el) return;
    const r = el.getBoundingClientRect();
    const d = document.createElement('div');
    d.id = '__dxqe_hl';
    d.style.cssText = [
      'position:fixed',
      'z-index:2147483647',
      'pointer-events:none',
      'border:3px solid #f59e0b',
      'border-radius:3px',
      'background:rgba(245,158,11,0.15)',
      'box-shadow:0 0 0 3000px rgba(0,0,0,0.28)',
      'transition:all 0.08s ease',
    ].join(';');
    d.style.top    = (r.top    - 2) + 'px';
    d.style.left   = (r.left   - 2) + 'px';
    d.style.width  = (r.width  + 4) + 'px';
    d.style.height = (r.height + 4) + 'px';
    document.body.appendChild(d);
  }

  const onOver = (e) => {
    const el = e.target;
    if (!el || el.id === '__dxqe_hl') return;
    setHL(el);
  };

  const onClick = (e) => {
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    console.log('[Assert] clicked:', e.target.tagName, e.target.textContent?.slice(0, 40));
  };

  document.body.style.cursor = 'crosshair';
  document.addEventListener('mouseover', onOver,  true);
  document.addEventListener('click',     onClick, true);

  window.__dxqe_assertOff = () => {
    document.body.style.cursor = '';
    const hl = document.getElementById('__dxqe_hl');
    if (hl) hl.remove();
    document.removeEventListener('mouseover', onOver,  true);
    document.removeEventListener('click',     onClick, true);
    delete window.__dxqe_assertOff;
  };
});
console.log('   Injection complete');

// Screenshot right after injection (should show crosshair cursor intent)
await page.screenshot({ path: join(OUT, '2-assert-injected.png') });
console.log('   Screenshot 2 saved: assert mode injected');

// ── Hover over First Name field ──────────────────────────────────────────
console.log('\n3. Hovering over First Name input...');
const firstName = page.locator('#firstName');
await firstName.scrollIntoViewIfNeeded();
await firstName.hover();
await page.waitForTimeout(500);

await page.screenshot({ path: join(OUT, '3-hover-firstname.png') });
console.log('   Screenshot 3 saved: hovering First Name');

// Verify the highlight div exists in the DOM
const hlExists = await page.evaluate(() => !!document.getElementById('__dxqe_hl'));
const hlStyle  = await page.evaluate(() => {
  const d = document.getElementById('__dxqe_hl');
  return d ? { border: d.style.border, top: d.style.top, visible: d.offsetWidth > 0 } : null;
});
console.log('   __dxqe_hl div in DOM:', hlExists ? 'YES ✅' : 'NO ❌');
console.log('   Highlight style:', JSON.stringify(hlStyle));

// ── Hover over Submit button ─────────────────────────────────────────────
console.log('\n4. Hovering over Submit button...');
const submit = page.locator('#submit');
await submit.scrollIntoViewIfNeeded();
await submit.hover();
await page.waitForTimeout(500);

await page.screenshot({ path: join(OUT, '4-hover-submit.png') });
console.log('   Screenshot 4 saved: hovering Submit');

const hlSubmit = await page.evaluate(() => {
  const d = document.getElementById('__dxqe_hl');
  return d ? { top: d.style.top, left: d.style.left, width: d.style.width } : null;
});
console.log('   Highlight position:', JSON.stringify(hlSubmit));

// ── Turn off assert mode ─────────────────────────────────────────────────
console.log('\n5. Turning off assert mode...');
await page.evaluate(() => { if (window.__dxqe_assertOff) window.__dxqe_assertOff(); });
await page.waitForTimeout(300);

await page.screenshot({ path: join(OUT, '5-assert-off.png') });
const hlGone = await page.evaluate(() => !document.getElementById('__dxqe_hl'));
console.log('   __dxqe_hl removed after off:', hlGone ? 'YES ✅' : 'NO ❌');

await browser.close();

console.log('\n══════════════════════════════════════════');
console.log(' RESULT:', hlExists && hlSubmit ? '✅ ASSERT MODE WORKS' : '❌ ASSERT MODE BROKEN');
console.log(' Screenshots saved to:', OUT);
console.log('══════════════════════════════════════════');
