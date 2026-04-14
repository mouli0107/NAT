import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { NewsPage } from '../pages/news.page';
import { EventsPage } from '../pages/events.page';
import { CareersPage } from '../pages/careers.page';
import { ContactUsPage } from '../pages/contact_us.page';
import { DigitalProductEngineeringPage } from '../pages/digital_product_engineering.page';
import { AgileDevelopmentPage } from '../pages/agile_development.page';
import { DigitalApplicationServicesPage } from '../pages/digital_application_services.page';
import { QualityEngineeringPage } from '../pages/quality_engineering.page';

type PageFixtures = {
  homePage: HomePage;
  newsPage: NewsPage;
  eventsPage: EventsPage;
  careersPage: CareersPage;
  contact_usPage: ContactUsPage;
  digital_product_engineeringPage: DigitalProductEngineeringPage;
  agile_developmentPage: AgileDevelopmentPage;
  digital_application_servicesPage: DigitalApplicationServicesPage;
  quality_engineeringPage: QualityEngineeringPage;
};

export const test = base.extend<PageFixtures>({
    homePage: async ({ page }, use) => { await use(new HomePage(page)); },
    newsPage: async ({ page }, use) => { await use(new NewsPage(page)); },
    eventsPage: async ({ page }, use) => { await use(new EventsPage(page)); },
    careersPage: async ({ page }, use) => { await use(new CareersPage(page)); },
    contact_usPage: async ({ page }, use) => { await use(new ContactUsPage(page)); },
    digital_product_engineeringPage: async ({ page }, use) => { await use(new DigitalProductEngineeringPage(page)); },
    agile_developmentPage: async ({ page }, use) => { await use(new AgileDevelopmentPage(page)); },
    digital_application_servicesPage: async ({ page }, use) => { await use(new DigitalApplicationServicesPage(page)); },
    quality_engineeringPage: async ({ page }, use) => { await use(new QualityEngineeringPage(page)); },
});

export { expect };
