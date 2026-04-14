import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { AgencyPage } from '../pages/agency.page';
import { CareersPage } from '../pages/careers.page';
import { ContactUsPage } from '../pages/contact_us.page';
import { Home1Page } from '../pages/home_1.page';
import { FileAClaimPage } from '../pages/file_a_claim.page';
import { AccountuserPage } from '../pages/accountuser.page';
import { LoginPage } from '../pages/login.page';
import { IndustriesPage } from '../pages/industries.page';
import { ConstructionPage } from '../pages/construction.page';

type PageFixtures = {
  homePage: HomePage;
  agencyPage: AgencyPage;
  careersPage: CareersPage;
  contact_usPage: ContactUsPage;
  home_1Page: Home1Page;
  file_a_claimPage: FileAClaimPage;
  accountuserPage: AccountuserPage;
  loginPage: LoginPage;
  industriesPage: IndustriesPage;
  constructionPage: ConstructionPage;
};

export const test = base.extend<PageFixtures>({
    homePage: async ({ page }, use) => { await use(new HomePage(page)); },
    agencyPage: async ({ page }, use) => { await use(new AgencyPage(page)); },
    careersPage: async ({ page }, use) => { await use(new CareersPage(page)); },
    contact_usPage: async ({ page }, use) => { await use(new ContactUsPage(page)); },
    home_1Page: async ({ page }, use) => { await use(new Home1Page(page)); },
    file_a_claimPage: async ({ page }, use) => { await use(new FileAClaimPage(page)); },
    accountuserPage: async ({ page }, use) => { await use(new AccountuserPage(page)); },
    loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
    industriesPage: async ({ page }, use) => { await use(new IndustriesPage(page)); },
    constructionPage: async ({ page }, use) => { await use(new ConstructionPage(page)); },
});

export { expect };
