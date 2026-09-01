import { Page, expect } from '@playwright/test';

/**
 * Checks all internal links on the current page for broken responses.
 * Collects all failures before asserting.
 */
export async function checkInternalLinks(page: Page): Promise<void> {
  const baseURL = new URL(page.url()).origin;
  const hostname = new URL(baseURL).hostname;

  const hrefs: string[] = await page.$$eval(
    'a[href]',
    (anchors: Element[], host: string) =>
      (anchors as HTMLAnchorElement[])
        .map((a) => a.getAttribute('href') ?? '')
        .filter(
          (h) =>
            h &&
            !h.startsWith('#') &&
            !h.startsWith('mailto:') &&
            !h.startsWith('tel:') &&
            !h.startsWith('javascript:'),
        )
        .map((h) =>
          h.startsWith('/') ? new URL(h, location.origin).href : h,
        )
        .filter((h) => {
          try {
            return new URL(h).hostname === host;
          } catch {
            return false;
          }
        })
        .slice(0, 20),
    hostname,
  );

  const broken: string[] = [];

  for (const href of hrefs) {
    try {
      const response = await page.request
        .head(href, { timeout: 8000 })
        .catch(() => page.request.get(href, { timeout: 8000 }));

      if (response.status() === 404 || response.status() >= 500) {
        broken.push(`[${response.status()}] ${href}`);
      }
    } catch {
      broken.push(`[NO RESPONSE] ${href}`);
    }
  }

  expect(
    broken,
    `Broken internal links:\n${broken.join('\n')}`,
  ).toHaveLength(0);
}
