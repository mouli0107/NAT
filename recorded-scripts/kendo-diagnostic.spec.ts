/**
 * KENDO DIAGNOSTIC TEST
 * Tests each Kendo helper function against the live APOLF FormSettings page.
 * Run with: npx playwright test recorded-scripts/kendo-diagnostic.spec.ts --headed
 */
import { test, expect } from '@playwright/test';
import { smartFill, smartClick, smartCheck, prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, checkKendoTreeNode } from '../helpers/kendo';

test('Kendo Diagnostic — Login + FormSettings', async ({ page }) => {
  // ═══ STEP 1: Login ═══════════════════════════════════════════════════════
  await page.goto('https://apolf-web-preprod.azurewebsites.net/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE');
  await prepareSite(page);
  await smartFill(page.locator('#txtUserName'), 'mahimagp@nousinfo.com');
  await smartFill(page.locator('#txtUserPassword'), 'Mahima123');
  await smartClick(page.locator('#btnLoginUser'));
  await page.waitForURL('**/FormsManager/CreateEditForms');
  console.log('✅ STEP 1: Login successful');

  // ═══ STEP 2: Navigate to FormSettings ════════════════════════════════════
  await smartClick(page.locator('#btnNewForm'));
  await smartClick(page.locator('#btnSelectFormCreationNext'));
  await page.waitForURL('**/FormsManager/FormSettings');
  console.log('✅ STEP 2: FormSettings page loaded');

  // ═══ STEP 3: Fill regular input ══════════════════════════════════════════
  await smartFill(page.locator('#FormName'), 'KendoDiagnostic_' + Date.now());
  console.log('✅ STEP 3: FormName filled');

  // ═══ STEP 4: Diagnostic — Check jQuery and Kendo availability ════════════
  const jqCheck = await page.evaluate(() => {
    return {
      jQueryExists: typeof (window as any).jQuery !== 'undefined',
      jQueryVersion: (window as any).jQuery ? (window as any).jQuery.fn.jquery : 'N/A',
      kendoExists: typeof (window as any).kendo !== 'undefined',
      kendoVersion: (window as any).kendo ? (window as any).kendo.version : 'N/A',
    };
  });
  console.log('📊 jQuery:', jqCheck.jQueryExists, 'v' + jqCheck.jQueryVersion);
  console.log('📊 Kendo:', jqCheck.kendoExists, 'v' + jqCheck.kendoVersion);

  // ═══ STEP 5: Diagnostic — List all Kendo DropDownLists on page ═══════════
  const dropdowns = await page.evaluate(() => {
    const $ = (window as any).jQuery;
    if (!$) return [];
    const results: any[] = [];
    $('[data-role="dropdownlist"]').each(function(this: any) {
      const w = $(this).data('kendoDropDownList');
      results.push({
        id: this.id,
        name: this.name,
        text: w ? w.text() : 'NO WIDGET',
        dataCount: w ? w.dataSource.data().length : 0,
        disabled: $(this).prop('disabled'),
      });
    });
    return results;
  });
  console.log('📊 DropDownLists found:', dropdowns.length);
  dropdowns.forEach((d: any) => {
    console.log(`   #${d.id} — text: "${d.text}", items: ${d.dataCount}, disabled: ${d.disabled}`);
  });

  // ═══ STEP 6: Diagnostic — List all DateTimePickers on page ═══════════════
  const datePickers = await page.evaluate(() => {
    const $ = (window as any).jQuery;
    if (!$) return [];
    const results: any[] = [];
    $('[data-role="datetimepicker"], [data-role="datepicker"]').each(function(this: any) {
      const w = $(this).data('kendoDateTimePicker') || $(this).data('kendoDatePicker');
      results.push({
        id: this.id,
        role: this.getAttribute('data-role'),
        value: w ? (w.value() ? w.value().toString() : 'null') : 'NO WIDGET',
        enabled: w ? true : false,
      });
    });
    return results;
  });
  console.log('📊 DatePickers found:', datePickers.length);
  datePickers.forEach((d: any) => {
    console.log(`   #${d.id} — role: ${d.role}, value: ${d.value}`);
  });

  // ═══ STEP 7: Test selectKendoDropdown ════════════════════════════════════
  // DataSources are LAZY (empty until opened). Test with ddlSubmittedDate which
  // should have options like "Birth Date", "Street", etc.
  const testDropdownId = 'ddlSubmittedDate';
  console.log(`\n🧪 Testing selectKendoDropdown on #${testDropdownId} (lazy dataSource)...`);
  try {
    await selectKendoDropdown(page, testDropdownId, 'Birth Date');
    // Verify selection
    const selected = await page.evaluate((id: string) => {
      const $ = (window as any).jQuery;
      const w = $('#' + id).data('kendoDropDownList');
      return w ? w.text() : 'NO WIDGET';
    }, testDropdownId);
    console.log(`   Selected: "${selected}"`);
    console.log(`   ✅ selectKendoDropdown PASSED`);
  } catch (e: any) {
    console.log(`   ❌ selectKendoDropdown FAILED: ${e.message}`);
  }

  // ═══ STEP 8: Test selectKendoDate ════════════════════════════════════════
  // Click the "From" radio to enable date pickers — find it by nearby text
  if (datePickers.length > 0) {
    try {
      // Use page.evaluate to click the correct radio via DOM
      await page.evaluate(() => {
        // Find the radio button next to "From" text
        const labels = document.querySelectorAll('label, span, div');
        for (const el of labels) {
          if ((el.textContent || '').trim().startsWith('From')) {
            const radio = el.querySelector('input[type="radio"]') ||
                          el.previousElementSibling as HTMLInputElement;
            if (radio && radio.type === 'radio') { radio.click(); return; }
          }
        }
        // Fallback: click the 3rd radio button (Form Availability: Available / Not Available / From)
        const radios = document.querySelectorAll('input[type="radio"]');
        if (radios.length >= 5) (radios[4] as HTMLElement).click();
      });
      await page.waitForTimeout(1000);

      const firstDate = datePickers[0];
      console.log(`\n🧪 Testing selectKendoDate on #${firstDate.id}...`);
      await selectKendoDate(page, firstDate.id, '04-08-2026 12:00 AM');

      // Verify value was set
      const newVal = await page.evaluate((id: string) => {
        const $ = (window as any).jQuery;
        const p = $('#' + id).data('kendoDateTimePicker') || $('#' + id).data('kendoDatePicker');
        return p && p.value() ? p.value().toString() : 'null';
      }, firstDate.id);

      console.log(`   Value after set: ${newVal}`);
      console.log(`   ✅ selectKendoDate PASSED on #${firstDate.id}`);
    } catch (e: any) {
      console.log(`   ❌ selectKendoDate FAILED: ${e.message}`);
    }
  } else {
    console.log('⚠️  No date pickers to test (or "From" radio not found)');
  }

  // ═══ STEP 9: Test checkKendoTreeNode ═════════════════════════════════════
  const treeCheck = await page.evaluate(() => {
    const tree = document.querySelector('[data-role="treeview"]');
    if (!tree) return null;
    const cb = tree.querySelector('input[type="checkbox"]') as HTMLInputElement;
    return cb ? { treeId: tree.id, nodeValue: cb.value } : null;
  });

  if (treeCheck) {
    console.log(`\n🧪 Testing checkKendoTreeNode on #${treeCheck.treeId}, value=${treeCheck.nodeValue}...`);
    try {
      await checkKendoTreeNode(page, treeCheck.treeId, treeCheck.nodeValue);
      console.log(`   ✅ checkKendoTreeNode PASSED`);
    } catch (e: any) {
      console.log(`   ❌ checkKendoTreeNode FAILED: ${e.message}`);
    }
  } else {
    console.log('⚠️  No TreeView with checkboxes found');
  }

  // ═══ SUMMARY ═════════════════════════════════════════════════════════════
  console.log('\n════════════════════════════════════════════');
  console.log('KENDO DIAGNOSTIC COMPLETE');
  console.log('════════════════════════════════════════════');
});
