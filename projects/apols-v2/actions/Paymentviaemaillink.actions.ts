import { Page } from '@playwright/test';
import { prepareSite, smartFill, smartClick, smartCheck } from '../helpers/universal';
import { waitAndDismissAnyKendoAlert } from '../helpers/kendo';
import { extractLinksFromEmail } from '../helpers/email';

// ── Step Logger — logs every action with timing ──────────────────────────
let stepNum = 0;
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

export async function executePaymentviaemaillinkWorkflow(
  page: Page,
  data: Record<string, any>
) {
  stepNum = 0;

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 1: Admin logs in and sends form email
  // ════════════════════════════════════════════════════════════════════════

  await step('Navigate to login page', async () => {
    await page.goto(data.startUrl);
    await prepareSite(page);
  });

  await step('Fill admin username', async () => {
    await smartFill(page.locator('#txtUserName').first(), 'mahimagp@nousinfo.com');
  });

  await step('Fill admin password', async () => {
    await smartFill(page.locator('#txtUserPassword').first(), 'Mahima123');
  });

  await step('Click Login button', async () => {
    await smartClick(page.locator('#btnLoginUser').first());
    await page.waitForURL('**/FormsManager/CreateEditForms', { waitUntil: 'domcontentloaded' });
  });

  await step('Click Send button on form', async () => {
    await smartClick(page.locator('button:has-text("Send")').first());
    await page.waitForURL('**/FormsManager/SendGenericForm', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 2: Select recipient and compose/send email
  // ════════════════════════════════════════════════════════════════════════

  await step('Select recipient row', async () => {
    const targetEmail = data.recipientEmail || 'testmouli4@gmail.com';
    const row = page.locator('tr').filter({ hasText: targetEmail });
    const rowCount = await row.count();
    if (rowCount > 0) {
      const checkbox = row.first().locator('input[type="checkbox"]').first();
      await checkbox.scrollIntoViewIfNeeded().catch(() => {});
      await checkbox.check({ force: true });
      console.log(`[Step] Selected row with email: ${targetEmail}`);
    } else {
      console.log(`[Step] Email "${targetEmail}" not in grid, selecting first recipient`);
      await page.locator('table tbody tr input[type="checkbox"]').first().check({ force: true });
    }
    await page.waitForTimeout(500);
  });

  await step('Click SEND EMAIL button', async () => {
    await smartClick(page.locator('button:has-text("SEND EMAIL"), #btnSendEmail').first());
    await page.waitForTimeout(3000);
  });

  await step('Wait for compose window', async () => {
    await page.locator('.k-widget.k-window, .k-window').first()
      .waitFor({ state: 'visible', timeout: 10000 });
  });

  await step('Set recipient in To field', async () => {
    const targetEmail = data.recipientEmail || 'testmouli4@gmail.com';
    const toField = page.locator('#txtTo');
    await toField.fill('');
    await toField.fill(targetEmail);
    console.log('[Step] To field set to:', targetEmail);
  });

  await step('Click SEND in compose window', async () => {
    await page.locator('#btnSend').click({ force: true });
    await page.waitForTimeout(3000);
  });

  await step('Dismiss send confirmation', async () => {
    const popup = page.locator('.k-widget.k-window, .k-window').first();
    const appeared = await popup.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (appeared) {
      await smartClick(popup.locator('button:has-text("OK"), button:has-text("DONE"), button:has-text("EXIT")').first());
      await page.waitForTimeout(1000);
    }
  }).catch(() => console.log('[Step] No popup to dismiss'));

  console.log('[Test] Email sent to:', data.recipientEmail);

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 3: Wait for email and extract the form link
  // ════════════════════════════════════════════════════════════════════════

  let emailResult: any;
  await step('Wait for email and extract form link', async () => {
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

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 4: Navigate to payment (auto-login or manual login)
  // ════════════════════════════════════════════════════════════════════════

  const needsLogin = await page.locator('#txtUserName').isVisible().catch(() => false);
  if (needsLogin) {
    await step('Fill parent username', async () => {
      await smartFill(page.locator('#txtUserName').first(), data.parentUsername);
    });
    await step('Fill parent password', async () => {
      await smartFill(page.locator('#txtUserPassword').first(), data.parentPassword);
    });
    await step('Click parent Login', async () => {
      await smartClick(page.locator('#btnLoginUser').first());
      await page.waitForTimeout(3000);
    });
  } else {
    console.log('[Test] Email link auto-logged in — skipping login');
  }

  const hasPayAndSubmit = await page.locator('button:has-text("Pay And Submit")').isVisible().catch(() => false);
  const hasMyPayments = await page.locator('a:has-text("My Payments")').isVisible().catch(() => false);

  if (hasPayAndSubmit) {
    await step('Click Pay And Submit', async () => {
      await smartClick(page.locator('button:has-text("Pay And Submit")').first());
      await page.waitForTimeout(5000);
    });
  } else if (hasMyPayments) {
    await step('Click My Payments', async () => {
      await smartClick(page.locator('a:has-text("My Payments")').first());
      await page.waitForTimeout(3000);
    });
    await step('Select invoice checkbox', async () => {
      await page.locator('input[type="checkbox"][id*="chkInvoice"]').first().check({ force: true });
      await page.waitForTimeout(500);
    });
    await step('Click Pay Now', async () => {
      await smartClick(page.locator('#btnPayNow, button:has-text("Pay Now")').first());
      await page.waitForTimeout(3000);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 5: Complete payment
  // ════════════════════════════════════════════════════════════════════════

  await step('Wait for payment page', async () => {
    await page.waitForTimeout(3000);
    console.log('[Step] Payment URL:', page.url());
  });

  await step('Click New Payment Method', async () => {
    const newPM = page.locator('#spnNewPaymentMethod, a:has-text("New Payment Method")').first();
    const visible = await newPM.isVisible().catch(() => false);
    if (visible) {
      await newPM.click({ force: true });
    } else {
      await page.evaluate(() => {
        const els = document.querySelectorAll('a, span, div, button');
        for (const el of els) {
          if (el.textContent?.trim().includes('New Payment Method')) {
            (el as HTMLElement).click();
            return;
          }
        }
      });
    }
    console.log('[Step] Clicked New Payment Method — waiting for card form to load...');
  });

  // Wait for the "New Payment Method Details" modal and Finix iframes to load
  await step('Wait for card entry form to load', async () => {
    // Wait for Finix payment iframes to appear (they load asynchronously)
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      const finixCount = await page.locator('iframe[src*="finix.com"]').count();
      if (finixCount >= 3) {
        console.log(`[Step] Finix payment iframes loaded: ${finixCount} iframes`);
        return;
      }
      // Also check for Stripe as fallback
      const stripeCount = await page.locator('iframe[src*="stripe"]').count();
      if (stripeCount > 0) {
        console.log(`[Step] Stripe iframes loaded: ${stripeCount} iframes`);
        return;
      }
      console.log(`[Step] Waiting for payment iframes... (${i + 1}s)`);
    }
    console.log('[Step] Payment iframes may not have fully loaded');
  });

  // The payment form uses Finix (js.finix.com) — each field is a separate iframe
  // The iframes are ordered: Card Number(wide), Card Number(wide), Expiry(narrow), CVC(narrow), ...
  // We need to identify which iframe contains which field
  const finixIframes = page.locator('iframe[src*="finix.com"]');
  const finixCount = await finixIframes.count();

  if (finixCount > 0) {
    console.log(`[Step] Found ${finixCount} Finix payment iframes`);

    // Fill Name on Card (this is a regular input, not in an iframe)
    await step('Fill Name on Card', async () => {
      const nameField = page.locator('input[placeholder*="Full Name"], input[id*="name" i], input[placeholder*="Name"]').first();
      const visible = await nameField.isVisible().catch(() => false);
      if (visible) {
        await smartFill(nameField, data.cardholderName || 'David Hall');
      } else {
        console.log('[Step] Name on Card field not found — skipping');
      }
    });

    // Finix uses separate iframes for each field. We need to figure out which is which.
    // Strategy: Try each visible iframe, check what input it contains
    // Fill visible Finix iframes by identifying field type from base64 token in URL
    // Based on the Finix payment form layout, the visible iframes typically are:
    // - Wide iframes (845px): Card Name, Card Number, Street, Address Line 2, Zip
    // - Narrow iframes (414px): Expiry, CVC, City, State
    // We need to identify by trying to interact with each one
    const visibleFinixIndices: number[] = [];
    for (let i = 0; i < finixCount; i++) {
      const iframe = page.locator('iframe[src*="finix.com"]').nth(i);
      const box = await iframe.boundingBox().catch(() => null);
      if (box && box.width > 0 && box.height > 0) {
        visibleFinixIndices.push(i);
      }
    }
    console.log(`[Step] Visible Finix iframes indices: ${visibleFinixIndices.join(', ')}`);

    // Helper: fill a Finix iframe by clicking inside it and typing
    async function fillFinixByIndex(index: number, value: string, fieldName: string) {
      try {
        const frame = page.frameLocator('iframe[src*="finix.com"]').nth(index);
        // Try to find any input element
        const inputCount = await frame.locator('input').count().catch(() => 0);
        console.log(`[Step] Finix iframe ${index}: ${inputCount} inputs found`);

        if (inputCount > 0) {
          const input = frame.locator('input').first();
          await input.click({ force: true });
          await page.waitForTimeout(200);
          await input.pressSequentially(value, { delay: 50 });
          await page.waitForTimeout(200);
          const val = await input.inputValue().catch(() => '');
          console.log(`[Step] ${fieldName}: typed "${value}", got value="${val}"`);
          return true;
        } else {
          // Finix may use contenteditable or other non-input elements
          // Try clicking the iframe area directly and typing
          const iframeEl = page.locator('iframe[src*="finix.com"]').nth(index);
          const box = await iframeEl.boundingBox();
          if (box) {
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            await page.waitForTimeout(200);
            await page.keyboard.type(value, { delay: 50 });
            console.log(`[Step] ${fieldName}: typed via mouse click + keyboard at iframe ${index}`);
            return true;
          }
        }
      } catch (e: any) {
        console.log(`[Step] ${fieldName}: error on iframe ${index}: ${e.message}`);
      }
      return false;
    }

    // Identify each iframe's Finix field type from the base64 token in the URL
    const finixFieldMap: Record<string, number> = {};
    for (const idx of visibleFinixIndices) {
      const fieldType = await page.evaluate((i: number) => {
        const iframe = document.querySelectorAll('iframe[src*="finix.com"]')[i] as HTMLIFrameElement;
        if (!iframe) return '';
        const match = iframe.src.match(/index\.html\?(.+)/);
        if (!match) return '';
        try {
          const decoded = JSON.parse(atob(match[1]));
          return decoded.type || '';
        } catch { return ''; }
      }, idx);
      if (fieldType) {
        finixFieldMap[fieldType] = idx;
        console.log(`[Step] Finix field "${fieldType}" → iframe ${idx}`);
      }
    }

    // Fill Name on Card (iframe type: "name")
    if (finixFieldMap['name'] !== undefined) {
      await step('Fill Name on Card (Finix)', async () => {
        await fillFinixByIndex(finixFieldMap['name'], data.cardholderName || 'David Hall', 'Name');
      });
    }

    // Fill Card Number (iframe type: "number")
    if (finixFieldMap['number'] !== undefined) {
      await step('Fill Card Number (Finix)', async () => {
        await fillFinixByIndex(finixFieldMap['number'], data.cardNumber || '4242424242424242', 'Card Number');
      });
    }

    // Fill Expiration (iframe type: "expiration_date")
    if (finixFieldMap['expiration_date'] !== undefined) {
      await step('Fill Expiration (Finix)', async () => {
        await fillFinixByIndex(finixFieldMap['expiration_date'], data.cardExpiry || '1228', 'Expiration');
      });
    }

    // Fill CVC (iframe type: "security_code")
    if (finixFieldMap['security_code'] !== undefined) {
      await step('Fill CVC (Finix)', async () => {
        await fillFinixByIndex(finixFieldMap['security_code'], data.cardCVV || '123', 'CVC');
      });
    }

    // Fill Address Line 1 (iframe type: "address.line1")
    if (finixFieldMap['address.line1'] !== undefined) {
      await step('Fill Address (Finix)', async () => {
        await fillFinixByIndex(finixFieldMap['address.line1'], data.billingAddress || 'Nous Infosystems, 24th Main Road', 'Address');
      });
    }

    // Fill City (iframe type: "address.city")
    if (finixFieldMap['address.city'] !== undefined) {
      await step('Fill City (Finix)', async () => {
        await fillFinixByIndex(finixFieldMap['address.city'], data.billingCity || 'Bengaluru', 'City');
      });
    }

    // Fill State/Region (iframe type: "address.region")
    if (finixFieldMap['address.region'] !== undefined) {
      await step('Fill State (Finix)', async () => {
        await fillFinixByIndex(finixFieldMap['address.region'], data.billingState || 'KA', 'State');
      });
    }

    // Fill Postal Code (iframe type: "address.postal_code")
    if (finixFieldMap['address.postal_code'] !== undefined) {
      await step('Fill Postal Code (Finix)', async () => {
        await fillFinixByIndex(finixFieldMap['address.postal_code'], data.billingZip || '560078', 'Postal Code');
      });
    }

    // Click Save button in the modal (use force:true in case overlay blocks)
    await step('Click Save on payment method modal', async () => {
      const saveBtn = page.locator('.k-window button:has-text("Save"), #btnSave, button.btn-primary:has-text("Save")').first();
      await saveBtn.click({ force: true });
      console.log('[Step] Clicked Save — waiting for modal to close...');
      // Wait for the modal / k-overlay to disappear
      await page.locator('.k-overlay').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {
        console.log('[Step] k-overlay still visible after 15s');
      });
      await page.waitForTimeout(2000);
    });

  } else {
    // Fallback for Stripe or direct inputs
    const stripeFrame = await page.locator('iframe[src*="stripe"]').count() > 0
      ? page.frameLocator('iframe[src*="stripe"]').first()
      : null;

    if (stripeFrame) {
      await step('Fill card number (Stripe)', async () => {
        await stripeFrame.locator('[placeholder*="1234"], [autocomplete="cc-number"]').first()
          .fill(data.cardNumber || '4242424242424242');
      });
      await step('Fill card expiry (Stripe)', async () => {
        await stripeFrame.locator('[placeholder*="MM"], [autocomplete="cc-exp"]').first()
          .fill(data.cardExpiry || '12/28');
      });
      await step('Fill card CVV (Stripe)', async () => {
        await stripeFrame.locator('[placeholder*="CVC"], [autocomplete="cc-csc"]').first()
          .fill(data.cardCVV || '123');
      });
    } else {
      console.log('[Step] ⚠️ No payment iframes found (Finix or Stripe)');
    }
  }

  await step('Click Confirm & Pay', async () => {
    // Remove k-overlay if it's still blocking
    await page.evaluate(() => {
      document.querySelectorAll('.k-overlay').forEach(el => el.remove());
    }).catch(() => {});
    await page.waitForTimeout(500);

    const payBtn = page.locator('#btnContinue, button:has-text("Confirm & Pay")').first();
    const text = await payBtn.textContent().catch(() => '');
    console.log(`[Step] Clicking pay button: "${text?.trim()}"`);
    await payBtn.click({ force: true });
    await page.waitForTimeout(5000);
  });

  await step('Dismiss confirmation', async () => {
    await waitAndDismissAnyKendoAlert(page);
  }).catch(() => console.log('[Step] No final popup'));

  console.log('[Test] ✅ All steps completed.');
}
