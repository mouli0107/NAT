import { Page, Locator } from '@playwright/test';

export const WhoWeArePageLocators = {
  /** Main heading "Who we are." */
  mainHeading: (page: Page): Locator => page.getByRole('heading', { name: 'Who we are.', level: 1 }),
  
  /** Link to see P&G's community impact */
  seeOurImpactLink: (page: Page): Locator => page.getByRole('link', { name: 'See our impact' }),
  
  /** Link to see P&G's brands */
  seeOurBrandsLink: (page: Page): Locator => page.getByRole('link', { name: 'See our brands' }),
  
  /** Button to toggle the video playback */
  toggleVideoButton: (page: Page): Locator => page.getByRole('button', { name: 'Toggle Video' }),
  
  /** Subheading about improving lives */
  improvingLivesHeading: (page: Page): Locator => page.getByRole('heading', { name: 'We believe in finding small but meaningful ways to improve lives—now and for generations to come.', level: 2 }),
  
  /** Heading about employee stories */
  employeeStoriesHeading: (page: Page): Locator => page.getByRole('heading', { name: 'Hear from a few employees who have shared their story on why they work at P&G.', level: 2 }),
  
  /** Link to P&G's purpose, values, and principles */
  purposeValuesLink: (page: Page): Locator => page.getByRole('link', { name: 'purpose, values, and principles' }),
  
  /** Link to P&G Total Rewards package */
  totalRewardsLink: (page: Page): Locator => page.getByRole('link', { name: "P&G's Total Rewards package" }),
  
  /** Previous button in carousel */
  previousButton: (page: Page): Locator => page.getByRole('button', { name: 'previous' }),
  
  /** Next button in carousel */
  nextButton: (page: Page): Locator => page.getByRole('button', { name: 'next' }),
  
  /** Link to watch Archie Riva video */
  archieRivaVideoLink: (page: Page): Locator => page.getByRole('link', { name: 'Watch: P&G + Me = Mutual Success | Archie Riva' }),
  
  /** Link to P&G Careers */
  careersLink: (page: Page): Locator => page.getByRole('link', { name: 'Careers' }),
  
  /** Main navigation */
  mainNavigation: (page: Page): Locator => page.getByRole('navigation', { name: 'Main Navigation' }),
  
  /** Skip to main content link */
  skipToMainContentLink: (page: Page): Locator => page.getByRole('link', { name: 'Skip to main content' }),
};