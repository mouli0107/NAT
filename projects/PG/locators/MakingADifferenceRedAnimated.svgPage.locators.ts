import { Page, Locator } from '@playwright/test';

export const MakingADifferenceRedAnimatedSvgPageLocators = {
  /** The SVG element containing the animated graphic */
  svgElement: (page: Page): Locator => page.locator('svg'),
};