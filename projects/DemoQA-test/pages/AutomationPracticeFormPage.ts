import { Page } from '@playwright/test';
import { AutomationPracticeFormPageLocators } from '@locators/AutomationPracticeFormPage.locators';

/**
 * Page Object — demoqa.com/automation-practice-form
 * All DOM interactions are delegated to the locators file.
 * This class only contains business methods.
 */
export class AutomationPracticeFormPage {
  constructor(private readonly page: Page) {}

  // ── Navigation ─────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    await this.page.goto('https://demoqa.com/automation-practice-form', {
      waitUntil: 'domcontentloaded',
    });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  // ── Personal Info ──────────────────────────────────────────────────────────

  async fillFirstName(value: string): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.firstNameInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.clear();
    await loc.fill(value);
  }

  async fillLastName(value: string): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.lastNameInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.clear();
    await loc.fill(value);
  }

  async fillEmail(value: string): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.emailInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.clear();
    await loc.fill(value);
  }

  async selectGender(gender: 'Male' | 'Female' | 'Other'): Promise<void> {
    const locMap = {
      Male:   AutomationPracticeFormPageLocators.maleRadio,
      Female: AutomationPracticeFormPageLocators.femaleRadio,
      Other:  AutomationPracticeFormPageLocators.otherRadio,
    };
    const loc = locMap[gender](this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async fillMobile(value: string): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.mobileInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.clear();
    await loc.fill(value);
  }

  // ── Date of Birth ──────────────────────────────────────────────────────────

  async fillDateOfBirth(month: string, year: string, day: string): Promise<void> {
    // Open the date picker
    const input = AutomationPracticeFormPageLocators.dateOfBirthInput(this.page);
    await input.waitFor({ state: 'visible' });
    await input.click();

    // Select month from the dropdown inside the picker
    const monthSelect = AutomationPracticeFormPageLocators.datePickerMonthSelect(this.page);
    await monthSelect.waitFor({ state: 'visible' });
    await monthSelect.selectOption({ label: month });

    // Select year
    const yearSelect = AutomationPracticeFormPageLocators.datePickerYearSelect(this.page);
    await yearSelect.selectOption({ label: year });

    // Click the day number in the calendar grid
    await this.page
      .locator(`xpath=//div[contains(@class,'react-datepicker__day') and not(contains(@class,'outside-month')) and normalize-space(text())='${day}']`)
      .first()
      .click();
  }

  // ── Subjects (autocomplete) ────────────────────────────────────────────────

  async addSubject(subject: string): Promise<void> {
    const input = AutomationPracticeFormPageLocators.subjectsInput(this.page);
    await input.waitFor({ state: 'visible' });
    await input.fill(subject);
    // Wait for autocomplete to appear and select the first match
    const option = AutomationPracticeFormPageLocators.subjectsFirstOption(this.page);
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
  }

  // ── Hobbies ───────────────────────────────────────────────────────────────

  async checkSports(): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.sportsCheckbox(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async checkReading(): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.readingCheckbox(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  async checkMusic(): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.musicCheckbox(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }

  // ── Address ───────────────────────────────────────────────────────────────

  async fillCurrentAddress(value: string): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.currentAddressInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.clear();
    await loc.fill(value);
  }

  async selectState(state: string): Promise<void> {
    // Click the react-select control to open the dropdown
    const control = AutomationPracticeFormPageLocators.stateDropdown(this.page);
    await control.waitFor({ state: 'visible' });
    await control.click();
    // Select option from the open dropdown
    const option = AutomationPracticeFormPageLocators.reactSelectOption(this.page, state);
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
  }

  async selectCity(city: string): Promise<void> {
    const control = AutomationPracticeFormPageLocators.cityDropdown(this.page);
    await control.waitFor({ state: 'visible' });
    await control.click();
    const option = AutomationPracticeFormPageLocators.reactSelectOption(this.page, city);
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async clickSubmit(): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.submitButton(this.page);
    await loc.waitFor({ state: 'visible' });
    // Scroll into view — demoqa has a sticky ad footer that can block the button
    await loc.scrollIntoViewIfNeeded();
    await Promise.all([
      this.page.waitForSelector('#example-modal-sizes-title-lg', { state: 'visible', timeout: 10000 }),
      loc.click(),
    ]);
  }

  // ── Success Modal ─────────────────────────────────────────────────────────

  async isSuccessModalVisible(): Promise<boolean> {
    const loc = AutomationPracticeFormPageLocators.successModalTitle(this.page);
    return loc.isVisible();
  }

  async getSuccessModalTitle(): Promise<string> {
    const loc = AutomationPracticeFormPageLocators.successModalTitle(this.page);
    await loc.waitFor({ state: 'visible' });
    return (await loc.textContent()) ?? '';
  }

  async closeSuccessModal(): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.successModalCloseButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
  }
}
