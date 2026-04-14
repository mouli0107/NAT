import { Page } from '@playwright/test';
import { SmartbearPageLocators } from '../locators/SmartbearPage.locators';

export class SmartbearPage {
  constructor(private page: Page) {}

  async navigate(): Promise<void> {
    await this.page.goto('https://smartbear.com/');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async clickAllowAllCookies(): Promise<void> {
    const locator = SmartbearPageLocators.allowAllCookiesButton(this.page);
    await locator.waitFor({ state: 'visible', timeout: 10000 });
    await locator.click();
  }

  async clickAI(): Promise<void> {
    const locator = SmartbearPageLocators.aiButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickProducts(): Promise<void> {
    const locator = SmartbearPageLocators.productsButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickResources(): Promise<void> {
    const locator = SmartbearPageLocators.resourcesButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickWhySmartbear(): Promise<void> {
    const locator = SmartbearPageLocators.whySmartbearButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickApplicationIntegrity(): Promise<void> {
    const locator = SmartbearPageLocators.applicationIntegrityLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickStore(): Promise<void> {
    const locator = SmartbearPageLocators.storeLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickSupport(): Promise<void> {
    const locator = SmartbearPageLocators.supportLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickLogin(): Promise<void> {
    const locator = SmartbearPageLocators.loginLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async clickExploreProducts(): Promise<void> {
    const locator = SmartbearPageLocators.exploreProductsLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async clickTalkWithUs(): Promise<void> {
    const locator = SmartbearPageLocators.talkWithUsLink(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async isPageLoaded(): Promise<boolean> {
    try {
      const locator = SmartbearPageLocators.mainHeading(this.page);
      await locator.waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }
}