import { Page, Frame } from '@playwright/test';
import { DashboardPageLocators } from '../locators/DashboardPage.locators';
import { smartClick } from '../helpers/universal';

export class DashboardPage {
  private page: Page;
  private L: ReturnType<typeof DashboardPageLocators>;

  constructor(page: Page) {
    this.page = page;
    this.L = DashboardPageLocators(page);
  }

  /** Dismiss the "Your session has expired" modal if it appears */
  async dismissSessionExpired(): Promise<void> {
    try {
      const ok = this.L.sessionExpiredOk;
      if (await ok.isVisible({ timeout: 3000 })) {
        await ok.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      }
    } catch {
      // Modal not present — fine
    }
  }

  async selectBelgium() {
    await smartClick(this.L.belgium);
  }

  async selectP2phutBruxellesForest() {
    await this.L.p2phutBruxellesForest.scrollIntoViewIfNeeded();
    await smartClick(this.L.p2phutBruxellesForest);
  }

  /**
   * Click the Customer Search sidebar navigation link.
   *
   * DOM extraction confirmed: <a href="/customer-search" routerlinkactive="active">
   * lives in the sidebar nav (Angular component _ngcontent-c6).
   * This is an icon-only link (no text), always visible after location is selected.
   * Much more reliable than the lazily-loaded tile cards.
   */
  async clickCustomerSearchLink() {
    await smartClick(this.L.customerSearchLink);
  }

  /**
   * Click the CUSTOMER MANAGEMENT tile on the dashboard.
   *
   * Angular dashboards sometimes render the tiles section inside an <iframe>
   * (widget embedding pattern). Standard page.locator() does NOT search iframes.
   *
   * Strategy (tried in order):
   *  1. Main document — case-insensitive text/XPath selectors
   *  2. Any child frame — same selectors
   *  3. Left sidebar navigation link — href/routerLink containing customer-management
   */
  async clickCustomerManagement() {
    // ── Strategy 1: main document ──────────────────────────────────────────

    // Try Playwright's built-in text selector (searches innerText, case-insensitive)
    const byText = this.page.locator('text=Customer Management, text=CUSTOMER MANAGEMENT')
      .filter({ visible: true }).first();

    if (await byText.isVisible({ timeout: 5000 }).catch(() => false)) {
      await byText.click();
      return;
    }

    // Try XPath — exact match on entire text content (handles split spans)
    const byXpath = this.page.locator(
      "xpath=//*[translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')='customer management']"
    ).filter({ visible: true }).first();

    if (await byXpath.isVisible({ timeout: 5000 }).catch(() => false)) {
      await byXpath.click();
      return;
    }

    // ── Strategy 2: search inside child frames (iframe pattern) ───────────
    for (const frame of this.page.frames()) {
      if (frame === this.page.mainFrame()) continue;

      const frameEl = frame.locator(
        "text=Customer Management, text=CUSTOMER MANAGEMENT"
      ).filter({ visible: true }).first();

      if (await frameEl.isVisible({ timeout: 3000 }).catch(() => false)) {
        await frameEl.click();
        return;
      }

      const frameXpath = frame.locator(
        "xpath=//*[translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')='customer management']"
      ).filter({ visible: true }).first();

      if (await frameXpath.isVisible({ timeout: 3000 }).catch(() => false)) {
        await frameXpath.click();
        return;
      }
    }

    // ── Strategy 3: left sidebar navigation link ───────────────────────────
    // Angular renders routerLink as <a href="..."> — look for customer-management href
    const sidebarLink = this.page.locator([
      'a[href*="customer-management"]',
      'a[ng-reflect-router-link*="customer-management"]',
      '[routerlink*="customer-management"]',
    ].join(', ')).filter({ visible: true }).first();

    if (await sidebarLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sidebarLink.click();
      return;
    }

    // ── Strategy 4: left sidebar — 4th nav icon ────────────────────────────
    // In the Shurgard dashboard the 4th sidebar icon navigates to customer management
    const navLinks = this.page.locator('nav a, aside a').filter({ visible: true });
    const navCount = await navLinks.count();
    if (navCount >= 4) {
      await navLinks.nth(3).click(); // 0-indexed, 4th link
      return;
    }

    throw new Error(
      'Could not find Customer Management tile in main document, iframes, or sidebar. ' +
      `Frames on page: ${this.page.frames().length}`
    );
  }
}
