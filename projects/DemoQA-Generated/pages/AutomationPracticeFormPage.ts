import { Page } from '@playwright/test';
import { AutomationPracticeFormPageLocators } from '../locators/AutomationPracticeFormPage.locators';

export class AutomationPracticeFormPage {
  constructor(private readonly page: Page) {}

  async navigate(): Promise<void> {
    await this.page.goto('https://demoqa.com/automation-practice-form');
    const heading = AutomationPracticeFormPageLocators.pageHeading(this.page);
    await heading.waitFor({ state: 'visible', timeout: 10000 });
  }

  async fillFirstName(firstName: string): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.firstNameInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(firstName);
  }

  async fillLastName(lastName: string): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.lastNameInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(lastName);
  }

  async fillEmail(email: string): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.emailInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(email);
  }

  async selectGenderMale(): Promise<void> {
    const label = AutomationPracticeFormPageLocators.maleRadioLabel(this.page);
    await label.waitFor({ state: 'visible' });
    await label.click();
  }

  async selectGenderFemale(): Promise<void> {
    const label = AutomationPracticeFormPageLocators.femaleRadioButton(this.page);
    await label.waitFor({ state: 'visible' });
    await this.page.evaluate((el) => (el as HTMLInputElement).click(), await label.elementHandle());
  }

  async selectGenderOther(): Promise<void> {
    const label = AutomationPracticeFormPageLocators.otherRadioButton(this.page);
    await label.waitFor({ state: 'visible' });
    await this.page.evaluate((el) => (el as HTMLInputElement).click(), await label.elementHandle());
  }

  async fillMobileNumber(mobile: string): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.mobileNumberInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(mobile);
  }

  async fillDateOfBirth(date: string): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.dateOfBirthInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.click();
    await loc.fill('');
    await this.page.keyboard.type(date);
    await this.page.keyboard.press('Enter');
  }

  async selectDateOfBirthFromPicker(day: string, month: string, year: string): Promise<void> {
    const dateInput = AutomationPracticeFormPageLocators.dateOfBirthInput(this.page);
    await dateInput.waitFor({ state: 'visible' });
    await dateInput.click();
    
    const monthSelect = AutomationPracticeFormPageLocators.datePickerMonthSelect(this.page);
    await monthSelect.waitFor({ state: 'visible' });
    await monthSelect.selectOption({ label: month });
    
    const yearSelect = AutomationPracticeFormPageLocators.datePickerYearSelect(this.page);
    await yearSelect.waitFor({ state: 'visible' });
    await yearSelect.selectOption({ label: year });
    
    const dayLoc = AutomationPracticeFormPageLocators.datePickerDay(this.page, day);
    await dayLoc.waitFor({ state: 'visible' });
    await dayLoc.click();
  }

  async fillSubjects(subject: string): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.subjectsInput(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(subject);
    await this.page.keyboard.press('Enter');
  }

  async selectHobbySports(): Promise<void> {
    const label = AutomationPracticeFormPageLocators.sportsCheckboxLabel(this.page);
    await label.waitFor({ state: 'visible' });
    await label.click();
  }

  async selectHobbyReading(): Promise<void> {
    const label = AutomationPracticeFormPageLocators.readingCheckboxLabel(this.page);
    await label.waitFor({ state: 'visible' });
    await label.click();
  }

  async selectHobbyMusic(): Promise<void> {
    const checkbox = AutomationPracticeFormPageLocators.musicCheckbox(this.page);
    await checkbox.waitFor({ state: 'visible' });
    await this.page.evaluate((el) => (el as HTMLInputElement).click(), await checkbox.elementHandle());
  }

  async fillCurrentAddress(address: string): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.currentAddressTextarea(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.fill(address);
  }

  async selectState(stateName: string): Promise<void> {
    const stateContainer = AutomationPracticeFormPageLocators.stateDropdownContainer(this.page);
    await stateContainer.waitFor({ state: 'visible' });
    await stateContainer.click();
    
    const option = AutomationPracticeFormPageLocators.stateOption(this.page, stateName);
    await option.waitFor({ state: 'visible' });
    await option.click();
  }

  async selectCity(cityName: string): Promise<void> {
    const cityContainer = AutomationPracticeFormPageLocators.cityDropdownContainer(this.page);
    await cityContainer.waitFor({ state: 'visible' });
    await cityContainer.click();
    
    const option = AutomationPracticeFormPageLocators.cityOption(this.page, cityName);
    await option.waitFor({ state: 'visible' });
    await option.click();
  }

  async clickSubmit(): Promise<void> {
    const loc = AutomationPracticeFormPageLocators.submitButton(this.page);
    await loc.waitFor({ state: 'visible' });
    await loc.scrollIntoViewIfNeeded();
    await loc.click();
  }

  async getSuccessMessageText(): Promise<string> {
    const loc = AutomationPracticeFormPageLocators.successMessage(this.page);
    await loc.waitFor({ state: 'visible', timeout: 10000 });
    return await loc.textContent() || '';
  }

  async isSuccessModalVisible(): Promise<boolean> {
    const loc = AutomationPracticeFormPageLocators.modalContent(this.page);
    try {
      await loc.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async verifySuccessMessage(expectedText: string): Promise<boolean> {
    const actualText = await this.getSuccessMessageText();
    return actualText.includes(expectedText);
  }

  async fillCompleteForm(formData: {
    firstName: string;
    lastName: string;
    email: string;
    gender: 'Male' | 'Female' | 'Other';
    mobile: string;
    dateOfBirth: string;
    subjects: string[];
    hobbies: string[];
    currentAddress: string;
    state: string;
    city: string;
  }): Promise<void> {
    await this.fillFirstName(formData.firstName);
    await this.fillLastName(formData.lastName);
    await this.fillEmail(formData.email);
    
    if (formData.gender === 'Male') {
      await this.selectGenderMale();
    } else if (formData.gender === 'Female') {
      await this.selectGenderFemale();
    } else {
      await this.selectGenderOther();
    }
    
    await this.fillMobileNumber(formData.mobile);
    await this.fillDateOfBirth(formData.dateOfBirth);
    
    for (const subject of formData.subjects) {
      await this.fillSubjects(subject);
    }
    
    for (const hobby of formData.hobbies) {
      if (hobby === 'Sports') {
        await this.selectHobbySports();
      } else if (hobby === 'Reading') {
        await this.selectHobbyReading();
      } else if (hobby === 'Music') {
        await this.selectHobbyMusic();
      }
    }
    
    await this.fillCurrentAddress(formData.currentAddress);
    await this.selectState(formData.state);
    await this.selectCity(formData.city);
  }
}