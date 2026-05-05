import { Page } from '@playwright/test';
import { ChatPageLocators } from '../locators/ChatPage.locators';

export class ChatPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'networkidle' });
    await this.waitForChatToLoad();
  }

  async waitForChatToLoad(): Promise<void> {
    const chatContainer = ChatPageLocators.chatContainer(this.page);
    await chatContainer.waitFor({ state: 'visible', timeout: 10000 });
  }

  async sendMessage(message: string): Promise<void> {
    const messageInput = ChatPageLocators.messageInput(this.page);
    await messageInput.waitFor({ state: 'visible' });
    await messageInput.fill(message);
    
    const sendButton = ChatPageLocators.sendButton(this.page);
    await sendButton.waitFor({ state: 'visible' });
    await sendButton.click();
  }

  async typeMessage(message: string): Promise<void> {
    const messageInput = ChatPageLocators.messageInput(this.page);
    await messageInput.waitFor({ state: 'visible' });
    await messageInput.type(message, { delay: 50 });
  }

  async clickSendButton(): Promise<void> {
    const sendButton = ChatPageLocators.sendButton(this.page);
    await sendButton.waitFor({ state: 'visible' });
    await sendButton.click();
  }

  async closeChat(): Promise<void> {
    const closeButton = ChatPageLocators.closeButton(this.page);
    await closeButton.waitFor({ state: 'visible' });
    await closeButton.click();
  }

  async minimizeChat(): Promise<void> {
    const minimizeButton = ChatPageLocators.minimizeButton(this.page);
    await minimizeButton.waitFor({ state: 'visible' });
    await minimizeButton.click();
  }

  async getMessagesCount(): Promise<number> {
    const messages = ChatPageLocators.chatMessages(this.page);
    await messages.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    return await messages.count();
  }

  async getLastMessageText(): Promise<string> {
    const messages = ChatPageLocators.chatMessages(this.page);
    await messages.last().waitFor({ state: 'visible' });
    return await messages.last().textContent() || '';
  }

  async getAllMessages(): Promise<string[]> {
    const messages = ChatPageLocators.chatMessages(this.page);
    await messages.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    return await messages.allTextContents();
  }

  async isChatVisible(): Promise<boolean> {
    const chatContainer = ChatPageLocators.chatContainer(this.page);
    return await chatContainer.isVisible();
  }

  async isTypingIndicatorVisible(): Promise<boolean> {
    const typingIndicator = ChatPageLocators.typingIndicator(this.page);
    return await typingIndicator.isVisible().catch(() => false);
  }

  async waitForTypingIndicator(): Promise<void> {
    const typingIndicator = ChatPageLocators.typingIndicator(this.page);
    await typingIndicator.waitFor({ state: 'visible', timeout: 5000 });
  }

  async fillContactForm(name: string, email: string): Promise<void> {
    const nameInput = ChatPageLocators.nameInput(this.page);
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.fill(name);
    
    const emailInput = ChatPageLocators.emailInput(this.page);
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill(email);
  }

  async startChat(): Promise<void> {
    const startChatButton = ChatPageLocators.startChatButton(this.page);
    await startChatButton.waitFor({ state: 'visible' });
    await startChatButton.click();
  }

  async getWelcomeMessage(): Promise<string> {
    const welcomeMessage = ChatPageLocators.welcomeMessage(this.page);
    await welcomeMessage.waitFor({ state: 'visible' });
    return await welcomeMessage.textContent() || '';
  }

  async waitForNewMessage(previousCount: number): Promise<void> {
    await this.page.waitForFunction(
      (prevCount) => {
        const messages = document.querySelectorAll('[data-testid="chat-message"]');
        return messages.length > prevCount;
      },
      previousCount,
      { timeout: 10000 }
    );
  }

  async isMessageInputEnabled(): Promise<boolean> {
    const messageInput = ChatPageLocators.messageInput(this.page);
    await messageInput.waitFor({ state: 'visible' });
    return await messageInput.isEnabled();
  }

  async getChatHeaderText(): Promise<string> {
    const chatHeader = ChatPageLocators.chatHeader(this.page);
    await chatHeader.waitFor({ state: 'visible' });
    return await chatHeader.textContent() || '';
  }
}