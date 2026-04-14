import { Page } from '@playwright/test';

export const LoadFormPageLocators = {
  txtquestionctrl12370Input: (page: Page) => page.locator('#txtQuestionCtrl1_2370'),
  txtquestionctrl12371Input: (page: Page) => page.locator('#txtQuestionCtrl1_2371'),
  agawam: (page: Page) => page.locator('#f30f0482-9205-41a1-abc9-9433cea4a0db'),
  other: (page: Page) => page.locator('xpath=//*[@id="divDdlQuestion_2373"]/div'),
  al: (page: Page) => page.locator('#746bd5c4-e0d9-4bc8-9d04-db17ad8f963b'),
  ar: (page: Page) => page.locator('#6be88929-1f56-4917-9e89-1db165899f65'),
  txtquestionctrl12375Input: (page: Page) => page.locator('#txtQuestionCtrl1_2375'),
  txtquestionctrl12376Input: (page: Page) => page.locator('#txtQuestionCtrl1_2376'),
  li107: (page: Page) => page.locator('#c061695e-1b0c-43c8-8a43-281745908802'),
  mmDdYyyyInput: (page: Page) => page.locator('#txtQuestionCntrl1_2379'),
  studentRegistration202425IJo: (page: Page) => page.locator('xpath=//div[5]'),
  f: (page: Page) => page.locator('xpath=//*[@id="divDdlQuestion_2378"]/span/span/span[1]'),
  previousButton: (page: Page) => page.locator('#btnTabPreviousBottom'),
  txtquestionctrl11834Input: (page: Page) => page.locator('#txtQuestionCtrl1_1834'),
  txtquestionctrl11835Input: (page: Page) => page.locator('#txtQuestionCtrl1_1835'),
  txtquestionctrl11838Input: (page: Page) => page.locator('#txtQuestionCtrl1_1838'),
  errorImage: (page: Page): Locator => page.getByRole('img',
  sachinTendulkarOption: (page: Page): Locator => page.getByText('Sachin Tendulkar'),
  logOutLink: (page: Page): Locator => page.getByRole('link',
  sachinTendulkar: (page: Page) => page.locator('xpath=//header/div[2]/h4/strong'),
};
