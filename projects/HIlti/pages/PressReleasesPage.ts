import { Page } from '@playwright/test';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
export class PressReleasesPage {
  private page: Page;
  constructor(page: Page) {
    this.page = page;
  }
}