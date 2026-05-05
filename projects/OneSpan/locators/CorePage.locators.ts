import { Page, Locator } from '@playwright/test';

export const CorePageLocators = {
  // Uniqueness: unique | Stability: stable | Fallback: //iframe[contains(@src, 'driftt.com')]
  driftIframe: (page: Page): Locator => page.locator("xpath=//iframe[@id='drift-widget']"),

  // Uniqueness: unique | Stability: stable | Fallback: //div[contains(@class, 'chat-container')]
  chatContainer: (page: Page): Locator => page.locator("xpath=//*[@data-testid='chat-container']"),

  // Uniqueness: unique | Stability: stable | Fallback: //textarea[@placeholder='Type a message...']
  messageInput: (page: Page): Locator => page.locator("xpath=//textarea[@name='message']"),

  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //button[@aria-label='Send message']
  sendButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='send-button']"),

  // Uniqueness: unique | Stability: stable | Fallback: //button[normalize-space(text())='Close']
  closeButton: (page: Page): Locator => page.locator("xpath=//button[@aria-label='Close chat']"),

  // Uniqueness: unique | Stability: stable | Fallback: //div[contains(@class, 'messages')]
  messagesContainer: (page: Page): Locator => page.locator("xpath=//*[@data-testid='messages-container']"),

  // Uniqueness: verify | Stability: fragile — content changes | Fallback: //*[@data-testid='welcome-message']
  welcomeMessage: (page: Page): Locator => page.locator("xpath=//div[@role='article'][1]"),

  // Uniqueness: unique | Stability: stable | Fallback: //input[@type='text' and @placeholder='Name']
  nameInput: (page: Page): Locator => page.locator("xpath=//input[@name='name']"),

  // Uniqueness: unique | Stability: stable | Fallback: //input[@type='email' and @placeholder='Email']
  emailInput: (page: Page): Locator => page.locator("xpath=//input[@name='email']"),

  // Uniqueness: unique | Stability: stable | Fallback: //button[normalize-space(text())='Start Chat']
  startChatButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='start-chat-button']"),

  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(@aria-label, 'Open chat')]
  chatLauncher: (page: Page): Locator => page.locator("xpath=//button[@id='drift-widget-launcher']"),

  // Uniqueness: unique | Stability: stable | Fallback: //button[normalize-space(text())='Minimize']
  minimizeButton: (page: Page): Locator => page.locator("xpath=//button[@aria-label='Minimize chat']"),

  // Uniqueness: verify | Stability: stable | Fallback: //div[@role='log']
  chatHistory: (page: Page): Locator => page.locator("xpath=//*[@data-testid='chat-history']"),

  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(@aria-label, 'End')]
  endChatButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='end-chat-button']"),

  // Uniqueness: verify | Stability: stable | Fallback: //div[@role='status']
  typingIndicator: (page: Page): Locator => page.locator("xpath=//*[@data-testid='typing-indicator']"),

  // Uniqueness: unique | Stability: stable | Fallback: //input[@type='file']
  fileUploadInput: (page: Page): Locator => page.locator("xpath=//input[@name='file-upload']"),

  // Uniqueness: unique | Stability: stable | Fallback: //button[contains(@aria-label, 'Attach')]
  attachmentButton: (page: Page): Locator => page.locator("xpath=//button[@aria-label='Attach file']"),

  // Uniqueness: verify | Stability: fragile — dynamic content | Fallback: //div[contains(@class, 'agent-name')]
  agentName: (page: Page): Locator => page.locator("xpath=//*[@data-testid='agent-name']"),

  // Uniqueness: unique | Stability: stable | Fallback: //form[@name='chat-form']
  chatForm: (page: Page): Locator => page.locator("xpath=//*[@data-testid='chat-form']"),

  // Uniqueness: verify | Stability: stable | Fallback: //button[@type='submit']
  submitButton: (page: Page): Locator => page.locator("xpath=//*[@data-testid='submit-button']"),
};