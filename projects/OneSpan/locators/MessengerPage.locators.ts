import { Page, Locator } from '@playwright/test';

export const MessengerPageLocators = {
  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //textarea[@placeholder='Type a message...']
  messageInput: (page: Page): Locator => page.locator("xpath=//*[@data-testid='message-input']"),
  
  // Uniqueness: unique | Stability: stable — aria-label | Fallback: //button[@data-testid='send-button']
  sendButton: (page: Page): Locator => page.locator("xpath=//button[@aria-label='Send message']"),
  
  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //div[@role='log']
  messageList: (page: Page): Locator => page.locator("xpath=//*[@data-testid='message-list']"),
  
  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //main[@role='main']
  conversationArea: (page: Page): Locator => page.locator("xpath=//*[@data-testid='conversation-area']"),
  
  // Uniqueness: verify | Stability: stable — aria-label | Fallback: //button[@data-testid='attach-file']
  attachmentButton: (page: Page): Locator => page.locator("xpath=//button[@aria-label='Attach file']"),
  
  // Uniqueness: verify | Stability: stable — aria-label | Fallback: //button[@data-testid='emoji-picker']
  emojiButton: (page: Page): Locator => page.locator("xpath=//button[@aria-label='Add emoji']"),
  
  // Uniqueness: verify | Stability: stable — class + role | Fallback: //*[@data-testid='message-item']
  messageItem: (page: Page): Locator => page.locator("xpath=//*[@role='article' and contains(@class, 'message')]"),
  
  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //*[@data-testid='typing-indicator']
  typingIndicator: (page: Page): Locator => page.locator("xpath=//*[@aria-live='polite' and contains(@class, 'typing')]"),
  
  // Uniqueness: verify | Stability: stable — semantic element | Fallback: //header[@role='banner']
  conversationHeader: (page: Page): Locator => page.locator("xpath=//header[@data-testid='conversation-header']"),
  
  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //input[@placeholder='Search messages']
  searchInput: (page: Page): Locator => page.locator("xpath=//input[@data-testid='message-search']"),
  
  // Uniqueness: verify | Stability: stable — aria-label | Fallback: //button[normalize-space(text())='Close']
  closeButton: (page: Page): Locator => page.locator("xpath=//button[@aria-label='Close conversation']"),
  
  // Uniqueness: verify | Stability: stable — aria-label | Fallback: //button[@data-testid='menu-button']
  menuButton: (page: Page): Locator => page.locator("xpath=//button[@aria-label='Open menu']"),
  
  // Uniqueness: verify | Stability: stable — scoped to conversation area | Fallback: //*[@data-testid='conversation-area']//img[@alt]
  userAvatar: (page: Page): Locator => page.locator("xpath=//*[@data-testid='conversation-header']//img[@alt]"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //*[@data-testid='user-name']
  userName: (page: Page): Locator => page.locator("xpath=//*[@data-testid='conversation-header']//*[@class='user-name']"),
  
  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //div[@role='status']
  statusIndicator: (page: Page): Locator => page.locator("xpath=//*[@data-testid='user-status']"),
  
  // Uniqueness: verify | Stability: stable | Fallback: //button[normalize-space(text())='Load more']
  loadMoreButton: (page: Page): Locator => page.locator("xpath=//button[@data-testid='load-more-messages']"),
  
  // Uniqueness: verify | Stability: stable — scoped to message list | Fallback: //*[@data-testid='message-list']//*[contains(@class, 'timestamp')]
  messageTimestamp: (page: Page): Locator => page.locator("xpath=//*[@data-testid='message-list']//time"),
  
  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //*[@role='alert']
  errorMessage: (page: Page): Locator => page.locator("xpath=//*[@data-testid='error-message']"),
  
  // Uniqueness: unique | Stability: stable — test attribute | Fallback: //*[@aria-label='Message delivery status']
  deliveryStatus: (page: Page): Locator => page.locator("xpath=//*[@data-testid='delivery-status']"),
  
  // Uniqueness: verify | Stability: stable — scoped to specific message | Fallback: //button[@aria-label='Delete message']
  deleteMessageButton: (page: Page): Locator => page.locator("xpath=//button[@data-testid='delete-message']")
  messagesContainer: (page: Page): Locator => page.locator("xpath=//*[@data-testid='messages-container']"),
  messageItems: (page: Page): Locator => page.locator("xpath=//*[@data-testid='message-item']"),
  attachButton: (page: Page): Locator => page.locator("xpath=//button[@data-testid='attach-button']"),
  fileInput: (page: Page): Locator => page.locator("xpath=//input[@type='file' and @data-testid='file-upload']"),
  pageTitle: (page: Page): Locator => page.locator("xpath=//*[@data-testid='page-title']"),
  messengerHeader: (page: Page): Locator => page.locator("xpath=//header[@data-testid='messenger-header']"),
  messageTimestamps: (page: Page): Locator => page.locator("xpath=//*[@data-testid='message-timestamp']"),
  clearChatButton: (page: Page): Locator => page.locator("xpath=//button[@data-testid='clear-chat']"),
  newConversationButton: (page: Page): Locator => page.locator("xpath=//button[@data-testid='new-conversation']"),
  conversationItems: (page: Page): Locator => page.locator("xpath=//*[@id='conversation-list']//li"),
  messengerContainer: (page: Page): Locator => page.locator("xpath=//*[@data-testid='messenger-container']"),
  userStatus: (page: Page): Locator => page.locator("xpath=//*[@id='user-status']"),
  settingsButton: (page: Page): Locator => page.locator("xpath=//button[@data-testid='settings-button']"),
};
