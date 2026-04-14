import { Page } from '@playwright/test';

export async function selectKendoDropdown(page: Page, inputId: string, optionText: string): Promise<void> {
  await page.waitForFunction(function(id) {
    var $ = window.jQuery; if (!$) return false;
    return !!($ ('#' + id).data('kendoDropDownList') || $('#' + id).data('kendoComboBox'));
  }, inputId, { timeout: 10000 });
  var result = await page.evaluate(async function(params) {
    try {
      var $ = window.jQuery;
      var w = $('#' + params.inputId).data('kendoDropDownList') || $('#' + params.inputId).data('kendoComboBox');
      if (!w) return { ok: false, error: 'Widget not found: ' + params.inputId };
      w.open();
      await new Promise(function(resolve) { var waited = 0; (function check() { if (w.dataSource.data().length > 0 || waited > 5000) resolve(); else { waited += 200; setTimeout(check, 200); } })(); });
      var tf = w.options.dataTextField, data = w.dataSource.data(), found = false;
      if (tf && data.length) {
        for (var i = 0; i < data.length; i++) { if (String(data[i][tf]) === params.optionText) { w.select(i); w.trigger('change'); found = true; break; } }
        if (!found) { for (var j = 0; j < data.length; j++) { if (String(data[j][tf]).toLowerCase().indexOf(params.optionText.toLowerCase()) > -1) { w.select(j); w.trigger('change'); found = true; break; } } }
      }
      if (!found) { w.ul.find('li').each(function(idx) { if ($(this).text().trim() === params.optionText) { w.select(idx); w.trigger('change'); found = true; return false; } }); }
      if (!found) { w.ul.find('li').each(function(idx) { if ($(this).text().trim().toLowerCase().indexOf(params.optionText.toLowerCase()) > -1) { w.select(idx); w.trigger('change'); found = true; return false; } }); }
      w.close();
      return found ? { ok: true, selected: w.text() } : { ok: false, error: 'Option "' + params.optionText + '" not found (' + data.length + ' items)' };
    } catch(e) { return { ok: false, error: String(e) }; }
  }, { inputId: inputId, optionText: optionText });
  if (!result.ok) throw new Error('selectKendoDropdown failed on #' + inputId + ': ' + result.error);
  await page.waitForTimeout(300);
}

export async function selectKendoDate(page: Page, inputId: string, dateValue: string): Promise<void> {
  var parsed = await page.evaluate(function(dv) {
    var k = window.kendo, d = null;
    if (k && k.parseDate) {
      var fmts = ['MM-dd-yyyy hh:mm tt','MM/dd/yyyy hh:mm tt','MM-dd-yyyy','MM/dd/yyyy','yyyy-MM-dd'];
      for (var i = 0; i < fmts.length; i++) { d = k.parseDate(dv, fmts[i]); if (d) break; }
    }
    if (!d) d = new Date(dv);
    if (!d || isNaN(d.getTime())) return null;
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), hours: d.getHours(), minutes: d.getMinutes() };
  }, dateValue);
  if (!parsed) throw new Error('selectKendoDate: cannot parse "' + dateValue + '"');
  await page.waitForFunction(function(id) {
    var el = document.getElementById(id); if (!el) return false;
    var $ = window.jQuery; if (!$) return !!el;
    var w = $(el).closest('.k-datetimepicker, .k-datepicker, .k-timepicker');
    return w.length === 0 || (!w.find('.k-picker-wrap').hasClass('k-state-disabled') && !w.hasClass('k-state-disabled'));
  }, inputId, { timeout: 10000 });
  var calBtn = page.locator('[aria-controls="' + inputId + '_dateview"]');
  await calBtn.scrollIntoViewIfNeeded().catch(function() {});
  await calBtn.click();
  await page.waitForTimeout(500);
  var calendar = page.locator('.k-animation-container:visible .k-calendar').last();
  await calendar.waitFor({ state: 'visible', timeout: 5000 });
  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  for (var attempt = 0; attempt < 24; attempt++) {
    var headerText = await calendar.locator('.k-nav-fast, .k-header .k-link:nth-child(2)').first().innerText();
    var parts = headerText.trim().split(/\s+/);
    var calMonth = months.indexOf(parts[0]);
    var calYear = parseInt(parts[1]);
    if (calYear === parsed.year && calMonth === parsed.month) break;
    if (calYear < parsed.year || (calYear === parsed.year && calMonth < parsed.month)) {
      await calendar.locator('.k-nav-next, .k-header .k-link:last-child').first().click();
    } else {
      await calendar.locator('.k-nav-prev, .k-header .k-link:first-child').first().click();
    }
    await page.waitForTimeout(200);
  }
  var dayLinks = calendar.locator('td:not(.k-other-month) a, td:not(.k-other-month) .k-link');
  var dayCount = await dayLinks.count();
  for (var i = 0; i < dayCount; i++) {
    var text = await dayLinks.nth(i).innerText();
    if (text.trim() === String(parsed.day)) { await dayLinks.nth(i).click(); break; }
  }
  await page.waitForTimeout(300);
  var timeBtn = page.locator('[aria-controls="' + inputId + '_timeview"]');
  var hasTimeBtn = await timeBtn.count();
  if (hasTimeBtn && (parsed.hours !== 0 || parsed.minutes !== 0)) {
    await timeBtn.click();
    await page.waitForTimeout(300);
    var timePopup = page.locator('.k-animation-container:visible .k-time-list, .k-animation-container:visible .k-list-container').last();
    var timeVisible = await timePopup.waitFor({ state: 'visible', timeout: 3000 }).then(function() { return true; }).catch(function() { return false; });
    if (timeVisible) {
      var h = parsed.hours % 12 || 12;
      var ampm = parsed.hours < 12 ? 'AM' : 'PM';
      var timeStr = h + ':' + String(parsed.minutes).padStart(2, '0') + ' ' + ampm;
      var timeItem = timePopup.locator('li').filter({ hasText: timeStr }).first();
      if (await timeItem.count()) { await timeItem.scrollIntoViewIfNeeded().catch(function() {}); await timeItem.click(); }
    }
  }
  await page.waitForTimeout(300);
  await page.locator('body').click({ position: { x: 0, y: 0 } }).catch(function() {});
  await page.waitForTimeout(300);
}

export async function checkKendoTreeNode(page: Page, treeId: string, nodeValue: string, check: boolean = true): Promise<void> {
  var cb = page.locator('#' + treeId + ' input[type="checkbox"][value="' + nodeValue + '"]');
  await cb.waitFor({ state: 'visible', timeout: 5000 });
  var isChecked = await cb.isChecked();
  if (check && !isChecked) await cb.check();
  if (!check && isChecked) await cb.uncheck();
  await page.waitForTimeout(200);
}

export async function dismissKendoAlert(page: Page, buttonText: string = 'DONE'): Promise<string> {
  try {
    var aw = page.locator('.k-widget.k-window').filter({ has: page.locator('.k-window-content') });
    await aw.waitFor({ state: 'visible', timeout: 3000 });
    var msg = await aw.locator('.k-window-content').innerText().catch(function() { return ''; });
    await aw.locator('button:has-text("' + buttonText + '"), input[type="button"][value="' + buttonText + '"]').first().click();
    await aw.waitFor({ state: 'hidden', timeout: 3000 }).catch(function() {});
    return (msg || '').trim();
  } catch(e) { return ''; }
}

export async function waitAndDismissAnyKendoAlert(page: Page, expectedButton: string = 'DONE'): Promise<string | null> {
  try {
    var aw = page.locator('.k-widget.k-window');
    var appeared = await aw.waitFor({ state: 'visible', timeout: 2000 }).then(function() { return true; }).catch(function() { return false; });
    if (!appeared) return null;
    var msg = await aw.locator('.k-window-content p, .k-window-content').first().innerText().catch(function() { return ''; });
    await aw.locator('button:has-text("' + expectedButton + '"), input[type="button"][value="' + expectedButton + '"]').first().click();
    await page.waitForTimeout(500);
    return (msg || '').trim();
  } catch(e) { return null; }
}

export async function fillKendoGridDates(
  page: Page,
  gridId: string,
  daysFieldId: string = 'txtNoOfDaysforPaymentDue',
  paymentDateField: string = 'PaymentDate',
  dueDateField: string = 'DueDate',
  startOffset: number = 0,
  rowSpacing: number = 30
): Promise<number> {
  const rowCount = await page.evaluate((gid) => {
    var $ = (window as any).jQuery;
    var grid = $('#' + gid).data('kendoGrid');
    return grid ? grid.tbody.find('tr').length : 0;
  }, gridId);
  if (rowCount === 0) return 0;

  for (let row = 0; row < rowCount; row++) {
    // Set Payment Date
    await page.evaluate(async (params) => {
      var $ = (window as any).jQuery;
      var grid = $('#' + params.gridId).data('kendoGrid');
      try { grid.closeCell(); } catch(e) {}
      var cell = grid.tbody.find('tr').eq(params.row).find('td[data-field="' + params.dateField + '"]');
      grid.editCell(cell);
      for (var i = 0; i < 30; i++) {
        if (cell.find('input').length) break;
        await new Promise(function(r) { setTimeout(r, 100); });
      }
      var dateInput = cell.find('input');
      if (dateInput.length) {
        var picker = dateInput.data('kendoDatePicker') || dateInput.data('kendoDateTimePicker');
        if (picker) {
          var payDate = new Date();
          payDate.setDate(payDate.getDate() + params.startOffset + (params.row * params.rowSpacing));
          picker.value(payDate);
          try { picker.trigger('change'); } catch(e) {}
        }
      }
      grid.closeCell();
    }, { gridId, row, dateField: paymentDateField, startOffset, rowSpacing });
    await page.waitForTimeout(1500);

    // Set Due Date
    await page.evaluate(async (params) => {
      var $ = (window as any).jQuery;
      var grid = $('#' + params.gridId).data('kendoGrid');
      var daysForDue = parseInt($('#' + params.daysFieldId).val()) || 4;
      try { grid.closeCell(); } catch(e) {}
      var cell = grid.tbody.find('tr').eq(params.row).find('td[data-field="' + params.dateField + '"]');
      grid.editCell(cell);
      for (var i = 0; i < 30; i++) {
        if (cell.find('input').length) break;
        await new Promise(function(r) { setTimeout(r, 100); });
      }
      var dateInput = cell.find('input');
      if (dateInput.length) {
        var picker = dateInput.data('kendoDatePicker') || dateInput.data('kendoDateTimePicker');
        if (picker) {
          var dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + params.startOffset + (params.row * params.rowSpacing) + daysForDue);
          picker.value(dueDate);
          try { picker.trigger('change'); } catch(e) {}
        }
      }
      grid.closeCell();
    }, { gridId, row, dateField: dueDateField, daysFieldId, startOffset, rowSpacing });
    await page.waitForTimeout(1500);
  }

  await page.evaluate((gid) => {
    var $ = (window as any).jQuery;
    try { $('#' + gid).data('kendoGrid').closeCell(); } catch(e) {}
  }, gridId);
  await page.waitForTimeout(1000);
  return rowCount;
}
