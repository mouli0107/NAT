import { Page } from '@playwright/test';

export class SecurityHelper {
  constructor(private page: Page) {}

  async checkNoSensitiveDataInUrl(): Promise<void> {
    const url = this.page.url().toLowerCase();
    const patterns = ['password=', 'passwd=', 'pwd=', 'token=', 'secret=', 'api_key='];
    for (const p of patterns) {
      if (url.includes(p)) throw new Error('Sensitive data in URL: ' + p);
    }
  }

  async getSecurityHeaders(url: string): Promise<Record<string, boolean>> {
    const response = await this.page.request.get(url);
    const headers = response.headers();
    return {
      'x-frame-options':          !!headers['x-frame-options'],
      'x-content-type-options':   !!headers['x-content-type-options'],
      'content-security-policy':  !!headers['content-security-policy'],
      'strict-transport-security': !!headers['strict-transport-security'],
    };
  }
}
