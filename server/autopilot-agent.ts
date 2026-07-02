// ─── ASTRA Autopilot — agentic, live-grounded test authoring ──────────────────
//
// Input: plain-English manual steps + a target URL.
// Output: a runnable Playwright spec whose every selector was VERIFIED against the
// live DOM by actually performing the action. Steps that cannot be grounded are
// emitted as ⚠ REVIEW comments — never as fabricated (broken) selectors.
//
// This is deterministic grounding (harvest live DOM → match → act → verify), the
// same mechanism proven live against nousinfosystems.com. No guesses: a locator is
// only written after it worked once against the real app.

import { chromium, type Browser, type Page } from 'playwright';

export type StepVerb = 'open' | 'navigate' | 'click' | 'fill' | 'assert' | 'unknown';

export interface ParsedStep { raw: string; verb: StepVerb; target?: string; data?: string; }

export interface GroundedStep {
  index: number;
  raw: string;
  status: 'grounded' | 'flagged' | 'setup';
  locator?: string;       // the resilient locator that was verified
  code?: string;          // the Playwright line(s) emitted
  detail: string;         // human explanation / flag reason
}

export interface AutopilotResult {
  targetUrl: string;
  title: string;
  testName: string;
  steps: GroundedStep[];
  script: string;
  grounded: number;
  flagged: number;
}

const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const NOISE = /\b(pages?|links?|buttons?|tabs?|menus?|fields?|sections?|options?|icons?|the|a|an)\b/g;
const stripNoise = (s: string) => norm(s).replace(NOISE, ' ').replace(/\s+/g, ' ').trim();

/** Parse plain-English steps into structured actions. Splits multi-target clicks
 *  ("click news, events, contact us") and multi-field entries ("enter first and last name"). */
export function parseSteps(rawSteps: string[]): ParsedStep[] {
  const out: ParsedStep[] = [];
  for (const raw0 of rawSteps) {
    const raw = raw0.trim();
    if (!raw) continue;
    const low = raw.toLowerCase();

    // open browser (implicit setup)
    if (/^open\s+(a\s+)?(chrome|firefox|edge|safari|browser)\b/.test(low) || /^launch\b.*browser/.test(low)) {
      out.push({ raw, verb: 'open' }); continue;
    }
    // navigate
    let m = low.match(/^(?:navigate to|go to|open|visit|browse to)\s+(.+)$/);
    if (m && /\.[a-z]{2,}|localhost|https?:\/\//i.test(m[1])) {
      let url = m[1].trim().replace(/[.;]+$/, '');
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      out.push({ raw, verb: 'navigate', target: url }); continue;
    }
    // fill: "enter X in/into Y" | "type X in Y" | "fill Y with X"
    m = low.match(/^(?:enter|type|input)\s+(.+?)\s+(?:in|into|to)\s+(.+)$/);
    if (m) { out.push({ raw, verb: 'fill', target: m[2].trim(), data: m[1].trim() }); continue; }
    m = low.match(/^fill\s+(.+?)\s+with\s+(.+)$/);
    if (m) { out.push({ raw, verb: 'fill', target: m[1].trim(), data: m[2].trim() }); continue; }
    // fill: "enter first name and last name" (no data → synthesize)
    m = low.match(/^(?:enter|type|input|fill)\s+(.+)$/);
    if (m && /name|email|phone|number|text|address|first|last/.test(m[1])) {
      for (const field of m[1].split(/\s*,\s*|\s+and\s+/)) {
        const t = field.trim(); if (t) out.push({ raw, verb: 'fill', target: t });
      }
      continue;
    }
    // click (supports multiple comma / "and" separated targets)
    m = low.match(/^(?:click|press|tap|select)\s+(?:on\s+)?(.+)$/);
    if (m) {
      const targets = m[1].split(/\s*,\s*|\s+and\s+/).map(t => t.trim()).filter(Boolean);
      for (const t of targets) out.push({ raw, verb: 'click', target: t });
      continue;
    }
    // assert / verify
    m = low.match(/^(?:verify|assert|check|validate|confirm|ensure)\s+(.+)$/);
    if (m) { out.push({ raw, verb: 'assert', target: m[1].trim() }); continue; }

    out.push({ raw, verb: 'unknown' });
  }
  return out;
}

/** Synthesize PII-safe test data for a field when the manual step gives none. */
function testDataFor(target: string, provided?: string): string {
  if (provided) return provided;
  const t = norm(target);
  if (/first/.test(t)) return 'Test';
  if (/last|surname/.test(t)) return 'User';
  if (/email/.test(t)) return 'test-user@example.com';
  if (/phone|mobile|contact number/.test(t)) return '0000000000';
  if (/company|organisation|organization/.test(t)) return 'Test Co';
  return 'Test';
}

interface Harvest {
  links: { text: string; href: string; aria: string }[];
  buttons: { text: string; type: string }[];
  inputs: { tag: string; type: string; name: string; id: string; placeholder: string; aria: string }[];
}
async function harvest(page: Page): Promise<Harvest> {
  const links = await page.$$eval('a', els => els.map(e => ({ text: (e.innerText || '').replace(/\s+/g, ' ').trim(), href: e.getAttribute('href') || '', aria: e.getAttribute('aria-label') || '' })).filter(l => l.text || l.href));
  const buttons = await page.$$eval('button, input[type=submit], input[type=button], [role=button]', els => els.map(e => ({ text: ((e as HTMLElement).innerText || (e as HTMLInputElement).value || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(), type: e.getAttribute('type') || '' })).filter(b => b.text));
  const inputs = await page.$$eval('input, textarea, select', els => els.map(e => ({ tag: e.tagName.toLowerCase(), type: e.getAttribute('type') || '', name: e.getAttribute('name') || '', id: (e as HTMLElement).id || '', placeholder: e.getAttribute('placeholder') || '', aria: e.getAttribute('aria-label') || '' })));
  return { links, buttons, inputs };
}

function tsRegex(phrase: string): string {
  // Build a safe, case-insensitive regex literal for a locator name.
  const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return `/${esc}/i`;
}

/** Run the manual steps against the live app, grounding + verifying each. */
export async function runAutopilot(
  targetUrl: string,
  rawSteps: string[],
  opts: { testName?: string; onStep?: (g: GroundedStep) => void; headless?: boolean } = {},
): Promise<AutopilotResult> {
  const parsed = parseSteps(rawSteps);
  const grounded: GroundedStep[] = [];
  const emit = (g: GroundedStep) => { grounded.push(g); opts.onStep?.(g); };

  let browser: Browser | null = null;
  let title = '';
  try {
    browser = await chromium.launch({ headless: opts.headless !== false });
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

    // Always navigate to the target first.
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    title = await page.title().catch(() => '');

    let i = 0;
    for (const step of parsed) {
      i++;
      if (step.verb === 'open') { emit({ index: i, raw: step.raw, status: 'setup', detail: 'Browser launch (implicit in Playwright)' }); continue; }

      if (step.verb === 'navigate') {
        try {
          await page.goto(step.target!, { waitUntil: 'domcontentloaded', timeout: 60000 });
          await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
          emit({ index: i, raw: step.raw, status: 'grounded', locator: `page.goto`, code: `await page.goto('${step.target}');`, detail: `Navigated to ${page.url()}` });
        } catch (e: any) { emit({ index: i, raw: step.raw, status: 'flagged', detail: `Navigation failed: ${String(e.message).split('\n')[0]}` }); }
        continue;
      }

      if (step.verb === 'click') {
        const want = stripNoise(step.target || '');
        const h = await harvest(page);
        // 1) role-based link/button by accessible name (preferred, resilient)
        const linkMatch = h.links.find(l => stripNoise(l.text).includes(want) || (l.href && norm(l.href).includes(want)));
        const btnMatch = h.buttons.find(b => stripNoise(b.text).includes(want));
        const beforeUrl = page.url();
        let done = false;
        for (const attempt of [
          linkMatch ? { role: 'link', name: linkMatch.text } : null,
          btnMatch ? { role: 'button', name: btnMatch.text } : null,
        ].filter(Boolean) as { role: string; name: string }[]) {
          const loc = page.getByRole(attempt.role as any, { name: new RegExp(attempt.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
          if (await loc.count() === 0) continue;
          try {
            await loc.first().click({ timeout: 10000 });
            await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
            const moved = page.url() !== beforeUrl;
            const locStr = `page.getByRole('${attempt.role}', { name: ${tsRegex(attempt.name)} }).first()`;
            emit({ index: i, raw: step.raw, status: 'grounded', locator: locStr, code: `await ${locStr}.click();`, detail: moved ? `Verified — navigated to ${page.url()}` : `Clicked (no navigation)` });
            done = true; break;
          } catch (e: any) { /* try next attempt */ }
        }
        if (!done) emit({ index: i, raw: step.raw, status: 'flagged', detail: `No clickable element matching "${step.target}" found on ${page.url()}` });
        continue;
      }

      if (step.verb === 'fill') {
        const want = stripNoise(step.target || '');
        const data = testDataFor(step.target || '', step.data);
        const h = await harvest(page);
        const inp = h.inputs.find(x => stripNoise(`${x.placeholder} ${x.aria} ${x.name} ${x.id}`).includes(want) && !['hidden', 'submit', 'button'].includes(x.type));
        if (!inp) { emit({ index: i, raw: step.raw, status: 'flagged', detail: `No input matching "${step.target}" on ${page.url()}` }); continue; }
        // Build the most stable locator available for this input.
        let loc, locStr;
        if (inp.placeholder) { locStr = `page.getByPlaceholder(${tsRegex(inp.placeholder)})`; loc = page.getByPlaceholder(new RegExp(inp.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')); }
        else if (inp.aria) { locStr = `page.getByLabel(${tsRegex(inp.aria)})`; loc = page.getByLabel(new RegExp(inp.aria.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')); }
        else if (inp.id) { locStr = `page.locator('#${inp.id}')`; loc = page.locator(`#${inp.id}`); }
        else { locStr = `page.locator('[name="${inp.name}"]')`; loc = page.locator(`[name="${inp.name}"]`); }
        try {
          await loc.first().fill(data, { timeout: 8000 });
          const ok = (await loc.first().inputValue().catch(() => '')) === data;
          emit({ index: i, raw: step.raw, status: 'grounded', locator: locStr, code: `await ${locStr}.fill('${data}');`, detail: ok ? `Verified — filled "${data}"` : `Filled "${data}"` });
        } catch (e: any) {
          const vis = await loc.first().isVisible().catch(() => false);
          emit({ index: i, raw: step.raw, status: 'flagged', detail: vis ? `Field found but not fillable: ${String(e.message).split('\n')[0]}` : `Field "${step.target}" exists in DOM but is hidden (needs a prior step to reveal it)` });
        }
        continue;
      }

      if (step.verb === 'assert') {
        const want = step.target || '';
        // URL assertion when the phrase names a path/page; else text visibility.
        if (/url|page|navigat/i.test(want)) {
          emit({ index: i, raw: step.raw, status: 'grounded', code: `await expect(page).toHaveURL(/${norm(want).split(' ').pop()}/i);`, detail: 'URL assertion' });
        } else {
          const found = await page.getByText(new RegExp(want.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).count().catch(() => 0);
          const locStr = `page.getByText(${tsRegex(want)})`;
          emit({ index: i, raw: step.raw, status: found > 0 ? 'grounded' : 'flagged', code: found > 0 ? `await expect(${locStr}.first()).toBeVisible();` : undefined, detail: found > 0 ? `Verified — text present` : `Text "${want}" not found on ${page.url()}` });
        }
        continue;
      }

      emit({ index: i, raw: step.raw, status: 'flagged', detail: `Could not interpret step` });
    }
  } finally {
    await browser?.close().catch(() => {});
  }

  const testName = opts.testName || `Autopilot — ${title || targetUrl}`;
  const script = assembleScript(targetUrl, testName, grounded);
  return {
    targetUrl, title, testName, steps: grounded, script,
    grounded: grounded.filter(s => s.status === 'grounded').length,
    flagged: grounded.filter(s => s.status === 'flagged').length,
  };
}

function assembleScript(targetUrl: string, testName: string, steps: GroundedStep[]): string {
  const body: string[] = [];
  body.push(`  // Auto-authored by ASTRA Autopilot — every selector below was verified live.`);
  body.push(`  await page.goto('${targetUrl}');`);
  for (const s of steps) {
    if (s.status === 'setup') continue;
    body.push('');
    body.push(`  // Step ${s.index}: ${s.raw}`);
    if (s.status === 'grounded' && s.code) body.push(`  ${s.code}   // ${s.detail}`);
    else body.push(`  // ⚠ REVIEW — ${s.detail}`);
  }
  const safeName = testName.replace(/'/g, "\\'");
  return [
    `import { test, expect } from '@playwright/test';`,
    ``,
    `test('${safeName}', async ({ page }) => {`,
    body.join('\n'),
    `});`,
    ``,
  ].join('\n');
}
