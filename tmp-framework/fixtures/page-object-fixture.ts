import { test as base } from '@playwright/test';
import { HomePage } from '../pages/homePage';
import { NavPage } from '../pages/navPage';
import { ArticlePage } from '../pages/articlePage';

export type FrameworkFixtures = {
    homePage: HomePage;
    navPage: NavPage;
    articlePage: ArticlePage;
};

/**
 * Extends Playwright base test with custom page object fixtures.
 * Provides homePage, navPage, and articlePage to all tests.
 */
export const test = base.extend<FrameworkFixtures>({
    /**
     * Provides the HomePage page object for the test.
     */
    homePage: async ({ page }, use) => {
        await use(new HomePage(page));
    },

    /**
     * Provides the NavPage page object for the test.
     */
    navPage: async ({ page }, use) => {
        await use(new NavPage(page));
    },

    /**
     * Provides the ArticlePage page object for the test.
     */
    articlePage: async ({ page }, use) => {
        await use(new ArticlePage(page));
    },
});

export { expect, request } from '@playwright/test';
// v2 - re-parsed
