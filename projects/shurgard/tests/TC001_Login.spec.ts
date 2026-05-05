import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { loginToShurgard, attemptLogin } from '../actions/business/Shurgard.actions';

test.describe('TC001 — Login', () => {

  test('Valid credentials should land on dashboard', async ({ page }) => {
    await loginToShurgard(page);
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Invalid password should show error message and remain on login page', async ({ page }) => {
    const errorMsg = await attemptLogin(page, TestData.username, 'WrongPassword@999');

    // Must stay on login page
    await expect(page).toHaveURL(/.*login/);

    // App must show a non-empty error/alert (e.g. "Username or password is incorrect")
    expect(errorMsg.length).toBeGreaterThan(0);
    console.log('Login error message:', errorMsg);
  });

  test('Empty username should keep login button disabled and stay on login page', async ({ page }) => {
    await attemptLogin(page, '', TestData.password);
    // App must not navigate away from login
    await expect(page).toHaveURL(/.*login/);
    // Login button disabled when username is empty
    const loginBtn = page.locator(
      "xpath=//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'login')]"
    ).filter({ visible: true }).first();
    await expect(loginBtn).toBeDisabled();
  });

});
