import { Page, Locator } from '@playwright/test';

export const BrandsBlueAnimatedSvgPageLocators = {
  /** The root SVG element of the animated brands logo */
  svgRoot: (page: Page): Locator => page.locator('svg'),
  
  /** The document root element */
  pageRoot: (page: Page): Locator => page.locator('html'),
};