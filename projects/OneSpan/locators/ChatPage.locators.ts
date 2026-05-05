import { Page, Locator } from '@playwright/test';

export const ChatPageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //*[contains(@id,'drift-frame')]
  chatContainer: (page: Page): Locator => page.locator("xpath=//*[@id='drift-widget-container']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //textarea[@placeholder='Type a message']
  messageInput: (page: Page): Locator => page.locator("xpath=//textarea[@aria-label='Message input']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[normalize-space(text())='Send']
  sendButton: (page: Page): Locator => page.locator("xpath=//button[@aria-label='Send message']"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //*[@id='chat-log']
  messagesLog: (page: Page): Locator => page.locator("xpath=//*[@role='log']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[normalize-space(text())='×']
  closeButton: (page: Page): Locator => page.locator("xpath=//button[@aria-label='Close chat']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //*[@id='chat-header']
  chatHeader: (page: Page): Locator => page.locator("xpath=//*[@data-testid='chat-header']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[normalize-space(text())='Minimize']
  minimizeButton: (page: Page): Locator => page.locator("xpath=//button[@aria-label='Minimize chat']"),
  
  // Uniqueness: verify | Stability: fragile | Fallback: //*[@role='log']//*[contains(@class,'message')]
  chatMessages: (page: Page): Locator => page.locator("xpath=//*[@role='log']//*[@data-testid='chat-message']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@type='text' and contains(@placeholder,'Name')]
  nameInput: (page: Page): Locator => page.locator("xpath=//input[@name='name']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //input[@type='email' and contains(@placeholder,'Email')]
  emailInput: (page: Page): Locator => page.locator("xpath=//input[@name='email']"),
  
  // Uniqueness: unique | Stability: stable | Fallback: //button[normalize-space(text())='Start Chat']
  startChatButton: (page: Page): Locator => page.locator("xpath=//button[@data-testid='start-chat']"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //*[contains(@class,'typing-indicator')]
  typingIndicator: (page: Page): Locator => page.locator("xpath=//*[@aria-label='Typing indicator']"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //*[@id='chat-welcome']
  welcomeMessage: (page: Page): Locator => page.locator("xpath=//*[@data-testid='welcome-message']"),
};