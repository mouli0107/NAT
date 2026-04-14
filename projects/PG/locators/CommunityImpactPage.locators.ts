import { Page, Locator } from '@playwright/test';

export const CommunityImpactPageLocators = {
  /** Local Programs navigation link */
  localProgramsLink: (page: Page): Locator => page.getByRole('link', { name: 'Local Programs' }),
  
  /** Brand Programs navigation link */
  brandProgramsLink: (page: Page): Locator => page.getByRole('link', { name: 'Brand Programs' }),
  
  /** Global Programs navigation link */
  globalProgramsLink: (page: Page): Locator => page.getByRole('link', { name: 'Global Programs' }),
  
  /** View all blogs in Community Impact category link */
  viewAllBlogsLink: (page: Page): Locator => page.getByRole('link', { name: 'View all blogs in Community Impact category' }),
  
  /** Main heading - Community Impact */
  pageHeading: (page: Page): Locator => page.getByRole('heading', { name: 'Community Impact.', level: 1 }),
  
  /** Brands Making an Impact section heading */
  brandsImpactHeading: (page: Page): Locator => page.getByRole('heading', { name: 'Brands Making an Impact', level: 2 }),
  
  /** Taking Action Around the World section heading */
  takingActionHeading: (page: Page): Locator => page.getByRole('heading', { name: 'Taking Action Around the World', level: 2 }),
  
  /** Jump to Brand Programs section link with image and text */
  jumpToBrandProgramsLink: (page: Page): Locator => page.getByRole('link', { name: 'Jump to Brand Programs section Brand Programs' }),
  
  /** Jump to global programs section link with image and text */
  jumpToGlobalProgramsLink: (page: Page): Locator => page.getByRole('link', { name: 'Jump to global programs section Global Programs' }),
  
  /** Jump to Regional Programs section link with image and text */
  jumpToLocalProgramsLink: (page: Page): Locator => page.getByRole('link', { name: 'Jump to Regional Programs section Local Programs' }),
};