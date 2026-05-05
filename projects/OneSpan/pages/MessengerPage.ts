import { Page } from '@playwright/test';
import { MessengerPageLocators } from '@locators/MessengerPage.locators';

export class MessengerPage {
  constructor(private page: Page) {}

  async navigate(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'networkidle' });
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    const conversationArea = MessengerPageLocators.conversationArea(this.page);
    await conversationArea.waitFor({ state: 'visible', timeout: 10000 });
  }

  async typeMessage(message: string): Promise<void> {
    const messageInput = MessengerPageLocators.messageInput(this.page);
    await messageInput.waitFor({ state: 'visible' });
    await messageInput.fill(message);
  }

  async sendMessage(message: string): Promise<void> {
    await this.typeMessage(message);
    const sendButton = MessengerPageLocators.sendButton(this.page);
    await sendButton.waitFor({ state: 'visible' });
    await sendButton.click();
    await this.page.waitForTimeout(500);
  }

  async clickSendButton(): Promise<void> {
    const sendButton = MessengerPageLocators.sendButton(this.page);
    await sendButton.waitFor({ state: 'visible' });
    await sendButton.click();
  }

  async attachFile(filePath: string): Promise<void> {
    const attachmentButton = MessengerPageLocators.attachmentButton(this.page);
    await attachmentButton.waitFor({ state: 'visible' });
    await attachmentButton.click();
    
    const fileInput = this.page.locator('xpath=//input[@type="file"]');
    await fileInput.setInputFiles(filePath);
  }

  async openEmojiPicker(): Promise<void> {
    const emojiButton = MessengerPageLocators.emojiButton(this.page);
    await emojiButton.waitFor({ state: 'visible' });
    await emojiButton.click();
  }

  async getMessageCount(): Promise<number> {
    const messageList = MessengerPageLocators.messageList(this.page);
    await messageList.waitFor({ state: 'visible' });
    const messages = MessengerPageLocators.messageItem(this.page);
    return await messages.count();
  }

  async getLatestMessageText(): Promise<string> {
    const messages = MessengerPageLocators.messageItem(this.page);
    await messages.first().waitFor({ state: 'visible' });
    const lastMessage = messages.last();
    return await lastMessage.textContent() || '';
  }

  async waitForTypingIndicator(): Promise<void> {
    const typingIndicator = MessengerPageLocators.typingIndicator(this.page);
    await typingIndicator.waitFor({ state: 'visible', timeout: 5000 });
  }

  async waitForTypingIndicatorToDisappear(): Promise<void> {
    const typingIndicator = MessengerPageLocators.typingIndicator(this.page);
    await typingIndicator.waitFor({ state: 'hidden', timeout: 10000 });
  }

  async searchMessages(query: string): Promise<void> {
    const searchInput = MessengerPageLocators.searchInput(this.page);
    await searchInput.waitFor({ state: 'visible' });
    await searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async closeConversation(): Promise<void> {
    const closeButton = MessengerPageLocators.closeButton(this.page);
    await closeButton.waitFor({ state: 'visible' });
    await Promise.all([
      this.page.waitForLoadState('networkidle').catch(() => {}),
      closeButton.click()
    ]);
  }

  async openMenu(): Promise<void> {
    const menuButton = MessengerPageLocators.menuButton(this.page);
    await menuButton.waitFor({ state: 'visible' });
    await menuButton.click();
  }

  async getUserName(): Promise<string> {
    const userName = MessengerPageLocators.userName(this.page);
    await userName.waitFor({ state: 'visible' });
    return await userName.textContent() || '';
  }

  async isUserOnline(): Promise<boolean> {
    const statusIndicator = MessengerPageLocators.statusIndicator(this.page);
    await statusIndicator.waitFor({ state: 'visible' });
    const status = await statusIndicator.getAttribute('data-status');
    return status === 'online';
  }

  async loadMoreMessages(): Promise<void> {
    const loadMoreButton = MessengerPageLocators.loadMoreButton(this.page);
    await loadMoreButton.waitFor({ state: 'visible' });
    await loadMoreButton.click();
    await this.page.waitForTimeout(1000);
  }

  async deleteMessage(messageIndex: number): Promise<void> {
    const messages = MessengerPageLocators.messageItem(this.page);
    const targetMessage = messages.nth(messageIndex);
    await targetMessage.hover();
    
    const deleteButton = MessengerPageLocators.deleteMessageButton(this.page);
    await deleteButton.waitFor({ state: 'visible' });
    await deleteButton.click();
  }

  async waitForMessageDelivery(): Promise<void> {
    const deliveryStatus = MessengerPageLocators.deliveryStatus(this.page);
    await deliveryStatus.waitFor({ state: 'visible', timeout: 5000 });
  }

  async hasError(): Promise<boolean> {
    const errorMessage = MessengerPageLocators.errorMessage(this.page);
    return await errorMessage.isVisible().catch(() => false);
  }

  async getErrorMessage(): Promise<string> {
    const errorMessage = MessengerPageLocators.errorMessage(this.page);
    await errorMessage.waitFor({ state: 'visible' });
    return await errorMessage.textContent() || '';
  }

  async isConversationAreaVisible(): Promise<boolean> {
    const conversationArea = MessengerPageLocators.conversationArea(this.page);
    return await conversationArea.isVisible();
  }

  async waitForNewMessage(): Promise<void> {
    const messageList = MessengerPageLocators.messageList(this.page);
    await messageList.waitFor({ state: 'visible' });
    const initialCount = await this.getMessageCount();
    
    await this.page.waitForFunction(
      (expected) => {
        const messages = document.querySelectorAll('[role="article"]');
        return messages.length > expected;
      },
      initialCount,
      { timeout: 10000 }
    );
  }
}