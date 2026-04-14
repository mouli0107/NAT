import { Page } from '@playwright/test';

export class FormHelper {
  constructor(private page: Page) {}

  async fillField(selector: string, value: string): Promise<void> {
    const field = this.page.locator(selector).first();
    await field.waitFor({ state: 'visible', timeout: 8000 });
    await field.click();
    await field.fill('');
    await field.fill(value);
  }

  async fillForm(fields: Record<string, string>): Promise<void> {
    for (const [selector, value] of Object.entries(fields)) {
      await this.fillField(selector, value);
    }
  }

  async submitForm(submitSelector = 'button[type="submit"]'): Promise<void> {
    const btn = this.page.locator(submitSelector).first();
    if (await btn.count() > 0) {
      await btn.click();
    } else {
      await this.page.keyboard.press('Enter');
    }
  }

  async expectValidationError(fieldSelector: string): Promise<void> {
    const field = this.page.locator(fieldSelector).first();
    const parent = field.locator('..');
    const hasError =
      await parent.locator('[class*="error"],[class*="invalid"],[aria-describedby]').count() > 0 ||
      await this.page.locator('[role="alert"]').count() > 0 ||
      await this.page.locator('.error-message,.field-error,.validation-error').count() > 0;
    if (!hasError) {
      const validity = await field.evaluate(
        (el) => (el as HTMLInputElement).validity?.valid === false,
      );
      if (!validity) throw new Error('No validation error found for: ' + fieldSelector);
    }
  }

  async getFieldValue(selector: string): Promise<string> {
    return this.page.locator(selector).first().inputValue();
  }
}
