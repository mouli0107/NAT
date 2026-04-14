import { Page } from '@playwright/test';
import { CreateEditPagesPageLocators } from '../locators/CreateEditPagesPage.locators';
import { smartClick } from '../helpers/universal';
import { waitAndDismissAnyKendoAlert } from '../helpers/kendo';

export class CreateEditPagesPage {
  private page: Page;
  private L: ReturnType<typeof CreateEditPagesPageLocators>;

  constructor(page: Page) {
    this.page = page;
    this.L = CreateEditPagesPageLocators(page);
  }

  async publish() {
    // Debug: list all buttons on the page to find the Publish button
    const buttons = await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a.btn, input[type="button"]'))
        .map((el: any) => ({ tag: el.tagName, id: el.id, text: el.textContent?.trim().substring(0, 40), visible: el.offsetWidth > 0 }))
        .filter((b: any) => b.visible);
    });
    console.log('[CreateEditPagesPage] Visible buttons:', JSON.stringify(buttons.slice(0, 15)));

    // Try the standard locator first
    let clicked = false;
    const selectors = [
      '#btnPublishForms',
      'button:has-text("Publish")',
      'a:has-text("Publish")',
      'input[value="Publish"]',
    ];
    for (const sel of selectors) {
      const btn = this.page.locator(sel).first();
      const vis = await btn.isVisible().catch(() => false);
      if (vis) {
        console.log(`[CreateEditPagesPage] Clicking Publish via: ${sel}`);
        await smartClick(btn);
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      // Fallback: JS click
      console.log('[CreateEditPagesPage] Fallback: JS click on Publish');
      await this.page.evaluate(() => {
        const els = document.querySelectorAll('button, a, input[type="button"]');
        for (const el of els) {
          if (el.textContent?.trim().toLowerCase().includes('publish')) {
            (el as HTMLElement).click();
            return;
          }
        }
      });
    }

    await this.page.waitForTimeout(3000);
    await waitAndDismissAnyKendoAlert(this.page);

    // Dismiss any additional popups
    const doneBtn = this.L.doneButton;
    const doneVisible = await doneBtn.isVisible().catch(() => false);
    if (doneVisible) {
      await smartClick(doneBtn);
      await this.page.waitForTimeout(1000);
    }
    console.log('[CreateEditPagesPage] Form published');
  }
}
