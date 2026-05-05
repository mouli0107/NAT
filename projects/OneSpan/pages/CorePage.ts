import { Page } from '@playwright/test';
import { CorePageLocators } from '../locators/CorePage.locators';

export class CorePage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async waitForChatContainer(): Promise<void> {
    const locator = CorePageLocators.chatContainer(this.page);
    await locator.waitFor({ state: 'visible' });
  }

  async openChatLauncher(): Promise<void> {
    const locator = CorePageLocators.chatLauncher(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async typeMessage(message: string): Promise<void> {
    const locator = CorePageLocators.messageInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.fill(message);
  }

  async clickSendButton(): Promise<void> {
    const locator = CorePageLocators.sendButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async sendMessage(message: string): Promise<void> {
    await this.typeMessage(message);
    await this.clickSendButton();
  }

  async closeChat(): Promise<void> {
    const locator = CorePageLocators.closeButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async minimizeChat(): Promise<void> {
    const locator = CorePageLocators.minimizeButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async fillNameInput(name: string): Promise<void> {
    const locator = CorePageLocators.nameInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.fill(name);
  }

  async fillEmailInput(email: string): Promise<void> {
    const locator = CorePageLocators.emailInput(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.fill(email);
  }

  async clickStartChat(): Promise<void> {
    const locator = CorePageLocators.startChatButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async startChatWithDetails(name: string, email: string): Promise<void> {
    await this.fillNameInput(name);
    await this.fillEmailInput(email);
    await this.clickStartChat();
  }

  async getWelcomeMessageText(): Promise<string> {
    const locator = CorePageLocators.welcomeMessage(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.textContent() || '';
  }

  async waitForMessagesContainer(): Promise<void> {
    const locator = CorePageLocators.messagesContainer(this.page);
    await locator.waitFor({ state: 'visible' });
  }

  async endChat(): Promise<void> {
    const locator = CorePageLocators.endChatButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async isTypingIndicatorVisible(): Promise<boolean> {
    const locator = CorePageLocators.typingIndicator(this.page);
    try {
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async uploadFile(filePath: string): Promise<void> {
    const locator = CorePageLocators.fileUploadInput(this.page);
    await locator.waitFor({ state: 'attached' });
    await locator.setInputFiles(filePath);
  }

  async clickAttachmentButton(): Promise<void> {
    const locator = CorePageLocators.attachmentButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async getAgentName(): Promise<string> {
    const locator = CorePageLocators.agentName(this.page);
    await locator.waitFor({ state: 'visible' });
    return await locator.textContent() || '';
  }

  async submitChatForm(): Promise<void> {
    const locator = CorePageLocators.submitButton(this.page);
    await locator.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      locator.click()
    ]);
  }

  async switchToDriftIframe(): Promise<void> {
    const iframeLocator = CorePageLocators.driftIframe(this.page);
    await iframeLocator.waitFor({ state: 'attached' });
  }

  async waitForChatHistory(): Promise<void> {
    const locator = CorePageLocators.chatHistory(this.page);
    await locator.waitFor({ state: 'visible' });
  }

  async isChatContainerVisible(): Promise<boolean> {
    const locator = CorePageLocators.chatContainer(this.page);
    try {
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}