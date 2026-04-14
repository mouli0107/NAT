import { test, expect } from '@playwright/test';
import { TestData } from '../fixtures/test-data';
import { executePaymentviaemaillinkWorkflow } from '../actions/Paymentviaemaillink.actions';

test.describe('Payment via email link — Invalid Card', () => {
  test('Should fail payment with declined card (4000000000000002)', async ({ page }) => {
    await executePaymentviaemaillinkWorkflow(page, {
      ...TestData,
      // Stripe/Finix test card that always gets DECLINED
      cardNumber: '4000000000000002',
      cardExpiry: '1228',
      cardCVV: '123',
      cardholderName: 'Declined Card Test',
    });
  });

  test('Should fail payment with insufficient funds card (4000000000009995)', async ({ page }) => {
    await executePaymentviaemaillinkWorkflow(page, {
      ...TestData,
      // Stripe/Finix test card for insufficient funds
      cardNumber: '4000000000009995',
      cardExpiry: '1228',
      cardCVV: '123',
      cardholderName: 'Insufficient Funds Test',
    });
  });

  test('Should fail payment with expired card (past expiry date)', async ({ page }) => {
    await executePaymentviaemaillinkWorkflow(page, {
      ...TestData,
      cardNumber: '4242424242424242',
      cardExpiry: '0122',  // January 2022 — expired
      cardCVV: '123',
      cardholderName: 'Expired Card Test',
    });
  });

  test('Should fail payment with invalid CVV (wrong length)', async ({ page }) => {
    await executePaymentviaemaillinkWorkflow(page, {
      ...TestData,
      cardNumber: '4242424242424242',
      cardExpiry: '1228',
      cardCVV: '99',  // Only 2 digits — invalid
      cardholderName: 'Invalid CVV Test',
    });
  });

  test('Should fail payment with invalid card number (bad Luhn check)', async ({ page }) => {
    await executePaymentviaemaillinkWorkflow(page, {
      ...TestData,
      cardNumber: '1234567890123456',  // Fails Luhn checksum
      cardExpiry: '1228',
      cardCVV: '123',
      cardholderName: 'Invalid Number Test',
    });
  });
});
