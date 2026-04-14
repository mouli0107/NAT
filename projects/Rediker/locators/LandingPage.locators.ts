import { Page } from '@playwright/test';

export const LandingPageLocators = {
  joeRogan: (page: Page) => page.locator('xpath=//*[@id="ApplicantGrid"]/table/tbody/tr[2]/td[4]/div/span'),
  btn126Button: (page: Page) => page.locator('#btn_126'),
  saraTendulkar: (page: Page) => page.locator('xpath=//*[@id="ApplicantGrid"]/table/tbody/tr[4]/td[4]/div/span'),
  viewEditButton: (page: Page) => page.locator('#btn_107'),
  logOutLink: (page: Page) => page.getByRole('link', { name: 'Log Out', exact: false }),
  sachinTendulkar: (page: Page) => page.locator('xpath=//header/div[2]/h4/strong'),
  arjunTendulkarLink: (page: Page): Locator => page.getByText('Arjun Tendulkar'),
  errorImage: (page: Page): Locator => page.getByRole('img',
  arjunTendulkar: (page: Page) => page.locator('xpath=//*[@id="ApplicantGrid"]/table/tbody/tr[3]/td[4]/div/span'),
};
