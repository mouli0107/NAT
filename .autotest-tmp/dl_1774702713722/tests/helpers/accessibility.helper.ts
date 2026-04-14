import { Page } from '@playwright/test';

export class AccessibilityHelper {
  constructor(private page: Page) {}

  async checkPageTitle(): Promise<void> {
    const title = await this.page.title();
    if (!title || title.trim() === '') throw new Error('Page has no title');
  }

  async checkImagesHaveAlt(): Promise<string[]> {
    const images = this.page.locator('img');
    const count = await images.count();
    const missing: string[] = [];
    for (let i = 0; i < Math.min(count, 20); i++) {
      const alt = await images.nth(i).getAttribute('alt');
      const src = await images.nth(i).getAttribute('src') || 'img-' + i;
      if (alt === null && !src.startsWith('data:')) missing.push(src);
    }
    return missing;
  }

  async checkKeyboardNavigation(): Promise<string | null> {
    await this.page.keyboard.press('Tab');
    const focused = await this.page.evaluate(
      () => document.activeElement?.tagName?.toLowerCase(),
    );
    const ok = ['a', 'button', 'input', 'select', 'textarea', 'summary'];
    return ok.includes(focused || '') ? null : focused || 'none';
  }
}
