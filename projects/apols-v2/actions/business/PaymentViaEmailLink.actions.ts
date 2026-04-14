import { Page } from '@playwright/test';
import { AdminLoginPage } from '../../pages/AdminLoginPage';
import { CreateEditFormsPage } from '../../pages/CreateEditFormsPage';
import { SendGenericFormPage } from '../../pages/SendGenericFormPage';
import { InvoicePage } from '../../pages/InvoicePage';
import { InvoicePaymentPage, CardDetails, ACHDetails, PaymentMethod } from '../../pages/InvoicePaymentPage';
import { prepareSite, smartClick } from '../../helpers/universal';
import { extractLinksFromEmail } from '../../helpers/email';
import { getFormName } from '../../fixtures/shared-context';

// ── Step Logger — logs every action with timing ──────────────────────────
let stepNum = 0;
function resetSteps() { stepNum = 0; }
async function step(description: string, action: () => Promise<void>) {
  stepNum++;
  const start = Date.now();
  console.log(`[Step ${stepNum}] ▶ ${description}...`);
  try {
    await action();
    console.log(`[Step ${stepNum}] ✅ ${description} (${Date.now() - start}ms)`);
  } catch (err: any) {
    console.error(`[Step ${stepNum}] ❌ FAILED: ${description}`);
    console.error(`[Step ${stepNum}]    Error: ${err.message}`);
    throw err;
  }
}

// ── Shared type ──────────────────────────────────────────────────────────
export interface PaymentViaEmailLinkData {
  startUrl: string;
  adminUsername: string;
  adminPassword: string;
  recipientEmail: string;
  parentUsername?: string;
  parentPassword?: string;
  formName?: string;              // override form name (otherwise reads from shared-context.json)
  emailSubject?: string;
  emailWaitSeconds?: number;
  emailLinkDomain?: string;
  paymentMethod?: PaymentMethod;  // 'card' (default) or 'ach'
  card: CardDetails;
  ach?: ACHDetails;
  saveFuturePayments?: boolean;   // uncheck to not save card/account
}

// ═══════════════════════════════════════════════════════════════════════════
// TC_PAY_001 — Valid Payment via Email Link (End to End)
// ═══════════════════════════════════════════════════════════════════════════
export async function executeTC_PAY_001(page: Page, data: PaymentViaEmailLinkData) {
  resetSteps();

  // ── Phase 1: Admin Login ──────────────────────────────────────────────
  await step('Navigate to login page', async () => {
    await page.goto(data.startUrl);
    await prepareSite(page);
  });

  const loginPage = new AdminLoginPage(page);
  await step('Admin login', async () => {
    await loginPage.login(data.adminUsername, data.adminPassword);
  });

  // ── Phase 2: Select the published form and send email ──────────────────
  const formName = data.formName || getFormName();
  console.log(`[Test] Using form: "${formName}" (from shared context)`);

  await step('Search for form: ' + formName, async () => {
    // Search for the published form by name using the search field (#searchValue)
    const searchField = page.locator('#searchValue').first();
    if (await searchField.isVisible().catch(() => false)) {
      await searchField.click();
      await searchField.fill(formName);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(5000);
      console.log(`[Step] Searched for form: "${formName}"`);
    }
  });

  await step('Click Send on form: ' + formName, async () => {
    // Find the specific form row and click its Send button
    const formRow = page.locator('tr').filter({ hasText: formName });
    const rowCount = await formRow.count();
    if (rowCount > 0) {
      const sendBtn = formRow.first().locator('button:has-text("Send")').first();
      await sendBtn.click({ force: true });
      console.log(`[Step] Clicked Send on form: "${formName}"`);
    } else {
      throw new Error(`Form "${formName}" not found in grid after search. Run TC001 first.`);
    }
    await page.waitForURL('**/FormsManager/SendGenericForm', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
  });

  const sendPage = new SendGenericFormPage(page);
  await step('Select recipient', async () => {
    await sendPage.selectRecipient(data.recipientEmail);
  });

  await step('Click SEND EMAIL', async () => {
    await sendPage.clickSendEmail();
  });

  await step('Wait for compose window', async () => {
    await sendPage.waitForComposeWindow();
  });

  await step('Set To field: ' + data.recipientEmail, async () => {
    await sendPage.setToField(data.recipientEmail);
  });

  await step('Click SEND in compose', async () => {
    await sendPage.clickSendInCompose();
  });

  await step('Dismiss send confirmation', async () => {
    await sendPage.dismissPopup();
  }).catch(() => console.log('[Step] No popup to dismiss'));

  console.log('[Test] Email sent to:', data.recipientEmail);

  // ── Phase 3: Extract Email Link ───────────────────────────────────────
  let emailResult: any;
  await step('Wait for email and extract link', async () => {
    emailResult = await extractLinksFromEmail({
      subject: data.emailSubject || 'Fill',
      receivedAfter: new Date(Date.now() - 300000),
      waitSeconds: data.emailWaitSeconds || 120,
      pollIntervalSeconds: 10,
      linkDomain: data.emailLinkDomain || 'apolf-web-preprod.azurewebsites.net',
      pickStrategy: 'first',
    });
    console.log('[Test] Email link:', emailResult.primaryLink);
  });

  await step('Open form link from email', async () => {
    await page.goto(emailResult.primaryLink);
    await prepareSite(page);
    await page.waitForTimeout(3000);
  });

  // ── Phase 4: Parent login → Select student → Fill form → Submit & Pay ──

  // Step 4a: Login if needed
  const needsLogin = await page.locator('#txtUserName').isVisible().catch(() => false);
  if (needsLogin) {
    const parentLogin = new AdminLoginPage(page);
    await step('Parent login', async () => {
      await parentLogin.login(data.parentUsername || data.adminUsername, data.parentPassword || data.adminPassword);
    });
  } else {
    console.log('[Test] Email link auto-logged in — skipping login');
  }

  // Step 4b: Debug — log what page we're on and what's visible
  await step('Inspect page after email link', async () => {
    const url = page.url();
    console.log('[Step] Current URL:', url);

    // Log all visible buttons, links, headers for debugging
    const pageInfo = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('h1,h2,h3,h4,.panel-title')).map(
        (el: any) => el.textContent?.trim()
      ).filter(Boolean).slice(0, 5);
      const buttons = Array.from(document.querySelectorAll('button,a.btn')).map(
        (el: any) => ({ text: el.textContent?.trim().substring(0, 30), id: el.id, vis: el.offsetWidth > 0 })
      ).filter((b: any) => b.text && b.vis).slice(0, 10);
      const forms = Array.from(document.querySelectorAll('form')).length;
      const selects = Array.from(document.querySelectorAll('select')).map(
        (el: any) => ({ id: el.id, options: el.options?.length })
      ).slice(0, 5);
      return { headers, buttons, forms, selects };
    }).catch(() => ({ headers: [], buttons: [], forms: 0, selects: [] }));
    console.log('[Step] Page headers:', JSON.stringify(pageInfo.headers));
    console.log('[Step] Page buttons:', JSON.stringify(pageInfo.buttons));
    console.log('[Step] Forms:', pageInfo.forms, 'Selects:', JSON.stringify(pageInfo.selects));
  });

  // Step 4c: Select parent if popup/dropdown is shown
  await step('Select parent (if popup shown)', async () => {
    // Check for parent selection — could be a dropdown, radio buttons, or clickable list
    // Common patterns: select dropdown, radio list, clickable cards/rows

    // Pattern 1: Dropdown with parent names
    const parentDropdown = page.locator('select[id*="parent" i], select[id*="contact" i], select[id*="household" i]').first();
    if (await parentDropdown.isVisible().catch(() => false)) {
      // Select first option or specific parent
      await parentDropdown.selectOption({ index: 1 });
      await page.waitForTimeout(2000);
      console.log('[Step] Selected parent from dropdown');
      return;
    }

    // Pattern 2: Clickable parent name links/buttons
    const parentLink = page.locator('a:has-text("Hall"), button:has-text("Hall"), text=Hall, David').first();
    if (await parentLink.isVisible().catch(() => false)) {
      await parentLink.click();
      await page.waitForTimeout(2000);
      console.log('[Step] Clicked parent: Hall');
      return;
    }

    // Pattern 3: Radio buttons for parent selection
    const parentRadio = page.locator('input[type="radio"][name*="parent" i], input[type="radio"][name*="contact" i]').first();
    if (await parentRadio.isVisible().catch(() => false)) {
      await parentRadio.check({ force: true });
      await page.waitForTimeout(2000);
      console.log('[Step] Selected parent radio');
      return;
    }

    // Pattern 4: A "Continue" or "Next" button after auto-selecting
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Proceed")').first();
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(2000);
      console.log('[Step] Clicked Continue/Next');
      return;
    }

    console.log('[Step] No parent selection popup detected — continuing');
  });

  // Step 4d: Select student under the parent
  await step('Select student (if shown)', async () => {
    // Look for student list/grid — clickable student names
    const studentLink = page.locator('a:has-text("Lince"), text=Lince, button:has-text("Lince"), tr:has-text("Lince")').first();
    if (await studentLink.isVisible().catch(() => false)) {
      await studentLink.click();
      await page.waitForTimeout(3000);
      console.log('[Step] Selected student: Lince');
      return;
    }

    // Check for View/Edit button (from earlier recordings)
    const viewEditBtn = page.locator('button:has-text("View/Edit"), button:has-text("View"), a:has-text("View")').first();
    if (await viewEditBtn.isVisible().catch(() => false)) {
      await viewEditBtn.click();
      await page.waitForTimeout(3000);
      console.log('[Step] Clicked View/Edit');
      return;
    }

    console.log('[Step] No student selection detected — may already be on form');
  });

  // Step 4e: Fill form and submit — look for "Pay And Submit" or "Submit" button
  // The form may have fields to fill (Parent/Guardian, Street, City etc.)
  await step('Submit form with payment', async () => {
    // Wait for form to load
    await page.waitForTimeout(2000);

    // Check if we're on a form page with "Pay And Submit"
    const payAndSubmit = page.locator('button:has-text("Pay And Submit"), a:has-text("Pay And Submit")').first();
    const submitBtn = page.locator('button:has-text("Submit"), #btnSubmit').first();
    const nextBtn = page.locator('button:has-text("Next")').first();

    if (await payAndSubmit.isVisible().catch(() => false)) {
      await smartClick(payAndSubmit);
      await page.waitForTimeout(5000);
      console.log('[Step] Clicked "Pay And Submit"');
    } else if (await nextBtn.isVisible().catch(() => false)) {
      // Multi-page form — click Next until we reach payment
      for (let i = 0; i < 5; i++) {
        const next = page.locator('button:has-text("Next")').first();
        if (await next.isVisible().catch(() => false)) {
          await smartClick(next);
          await page.waitForTimeout(2000);
          // Check if Pay And Submit appeared
          if (await payAndSubmit.isVisible().catch(() => false)) {
            await smartClick(payAndSubmit);
            await page.waitForTimeout(5000);
            console.log('[Step] Clicked "Pay And Submit" after page', i + 1);
            break;
          }
        } else {
          break;
        }
      }
    } else if (await submitBtn.isVisible().catch(() => false)) {
      await smartClick(submitBtn);
      await page.waitForTimeout(5000);
      console.log('[Step] Clicked Submit');
    } else {
      // Maybe we're already on the payment page
      console.log('[Step] No submit button found — may already be on payment page');
    }
  });

  // Step 4f: Handle My Payments / My Invoices if we land there
  const hasMyPayments = await page.locator('a:has-text("My Payments")').isVisible().catch(() => false);
  if (hasMyPayments) {
    const invoicePage = new InvoicePage(page);
    await step('Click My Payments', async () => {
      await invoicePage.clickMyPayments();
    });
    const hasInvoice = await page.locator('input[type="checkbox"][id*="chkInvoice"]').isVisible().catch(() => false);
    if (!hasInvoice) {
      const myInvoicesTab = page.locator('a:has-text("My Invoices")').first();
      if (await myInvoicesTab.isVisible().catch(() => false)) {
        await step('Click My Invoices tab', async () => {
          await myInvoicesTab.click();
          await page.waitForTimeout(3000);
        });
      }
    }
    await step('Select invoice', async () => {
      const invoiceCheckbox = page.locator('input[type="checkbox"][id*="chkInvoice"], input[type="checkbox"][id*="invoice" i]').first();
      if (await invoiceCheckbox.isVisible().catch(() => false)) {
        await invoiceCheckbox.check({ force: true });
      }
    });
    await step('Click Pay Now', async () => {
      await invoicePage.clickPayNow();
    });
  }

  // ── Phase 5: Complete Payment ─────────────────────────────────────────
  const paymentPage = new InvoicePaymentPage(page);
  const method = data.paymentMethod || 'card';

  await step('Wait for payment page', async () => {
    await page.waitForTimeout(3000);
    console.log('[Step] Payment URL:', page.url());
  });

  await step('Click New Payment Method', async () => {
    await paymentPage.clickNewPaymentMethod();
  });

  if (method === 'ach' && data.ach) {
    // ── ACH / Bank Account payment flow ──
    await step('Select Bank Account tab', async () => {
      await paymentPage.selectBankAccountTab();
    });

    await step('Wait for ACH form', async () => {
      await paymentPage.waitForFinixIframes(2, 10);
    });

    await step('Fill ACH details (Bank Account)', async () => {
      await paymentPage.fillACHDetails(data.ach!);
    });
  } else {
    // ── Card payment flow ──
    await step('Wait for Finix iframes', async () => {
      await paymentPage.waitForFinixIframes();
    });

    await step('Fill card details (Finix)', async () => {
      await paymentPage.fillAllCardDetails(data.card);
    });
  }

  // Uncheck "Save for future payments" if requested
  if (data.saveFuturePayments === false) {
    await step('Uncheck Save for future payments', async () => {
      const checkbox = page.locator('#chkSaveFuturePayments, input[name*="save" i]').first();
      const checked = await checkbox.isChecked().catch(() => false);
      if (checked) {
        await checkbox.uncheck({ force: true });
        console.log('[Step] Unchecked "Save for future payments"');
      }
    });
  }

  await step('Click Save', async () => {
    await paymentPage.clickSave();
  });

  await step('Click Confirm & Pay', async () => {
    await paymentPage.clickConfirmAndPay();
  });

  await step('Dismiss confirmation', async () => {
    await paymentPage.dismissConfirmation();
  }).catch(() => console.log('[Step] No final popup'));

  console.log('[Test] ✅ All steps completed.');
}
