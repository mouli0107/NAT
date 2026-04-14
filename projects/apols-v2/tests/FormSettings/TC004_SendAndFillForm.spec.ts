import { test, expect } from '@playwright/test';
import { executeSendAndFillForm } from '../../actions/business/SendAndFillForm.actions';

test('TC004 — Send form email, extract link, fill form, pay', async ({ page }) => {
  await executeSendAndFillForm(page, {
    startUrl: 'https://apolf-web-preprod.azurewebsites.net/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE',
    credentials: {
      username: process.env.TEST_USERNAME || 'mahimagp@nousinfo.com',
      password: process.env.TEST_PASSWORD || 'Mahima123',
    },
    formName: 'Test_' + Date.now(),
    recipientEmail: 'testmouli4@gmail.com',

    // Email extraction
    emailSubject: 'Fill',
    emailLinkDomain: 'apolf-web-preprod.azurewebsites.net',
    emailWaitSeconds: 120,

    // Parent form data
    parentFirstName: 'Test',
    parentLastName: 'Parent',
    parentPhone: '9876543210',

    // Payment (uncomment when payment gateway details are known)
    // cardNumber: '4111111111111111',
    // cardExpiry: '12/28',
    // cardCVV: '123',
  });

  // If we reach here without error, the flow completed
  console.log('TC004 completed successfully');
});
