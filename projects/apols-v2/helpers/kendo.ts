import { Page } from '@playwright/test';

export async function selectKendoDropdown(page: Page, inputId: string, optionText: string): Promise<void> {
  await page.waitForFunction(function(id) {
    var $ = window.jQuery; if (!$) return false;
    var w = $('#' + id).data('kendoDropDownList') || $('#' + id).data('kendoComboBox');
    return w && !$('#' + id).prop('disabled') && w.dataSource.data().length > 0;
  }, inputId, { timeout: 10000 });
  var result = await page.evaluate(function(params) {
    try {
      var $ = window.jQuery;
      var w = $('#' + params.inputId).data('kendoDropDownList') || $('#' + params.inputId).data('kendoComboBox');
      if (!w) return { ok: false, error: 'Widget not found: ' + params.inputId };
      var tf = w.options.dataTextField, data = w.dataSource.data(), found = false;
      if (tf && data.length) {
        for (var i = 0; i < data.length; i++) { if (String(data[i][tf]) === params.optionText) { w.select(i); w.trigger('change'); found = true; break; } }
        if (!found) { for (var j = 0; j < data.length; j++) { if (String(data[j][tf]).toLowerCase().indexOf(params.optionText.toLowerCase()) > -1) { w.select(j); w.trigger('change'); found = true; break; } } }
      }
      if (!found) { w.ul.find('li').each(function(idx) { if ($(this).text().trim() === params.optionText) { w.select(idx); w.trigger('change'); found = true; return false; } }); }
      if (!found) { w.ul.find('li').each(function(idx) { if ($(this).text().trim().toLowerCase().indexOf(params.optionText.toLowerCase()) > -1) { w.select(idx); w.trigger('change'); found = true; return false; } }); }
      return found ? { ok: true, selected: w.text() } : { ok: false, error: 'Option not found: "' + params.optionText + '"' };
    } catch(e) { return { ok: false, error: String(e) }; }
  }, { inputId: inputId, optionText: optionText });
  if (!result.ok) throw new Error('selectKendoDropdown failed on #' + inputId + ': ' + result.error);
  await page.waitForTimeout(300);
}

export async function selectKendoDate(page: Page, inputId: string, dateValue: string): Promise<void> {
  await page.waitForFunction(function(id) {
    var $ = window.jQuery; if (!$) return false;
    return !!($ ('#' + id).data('kendoDateTimePicker') || $('#' + id).data('kendoDatePicker') || $('#' + id).data('kendoTimePicker'));
  }, inputId, { timeout: 10000 });
  var result = await page.evaluate(function(params) {
    try {
      var $ = window.jQuery, el = $('#' + params.inputId);
      var picker = el.data('kendoDateTimePicker') || el.data('kendoDatePicker') || el.data('kendoTimePicker');
      if (!picker) return { ok: false, error: 'No picker on #' + params.inputId };
      picker.enable(true);
      var k = window.kendo, parsed = null;
      if (k && k.parseDate) {
        var fmts = ['MM-dd-yyyy hh:mm tt','MM/dd/yyyy hh:mm tt','MM-dd-yyyy','MM/dd/yyyy','yyyy-MM-dd','MM-dd-yyyy HH:mm','dd-MM-yyyy'];
        for (var i = 0; i < fmts.length; i++) { parsed = k.parseDate(params.dateValue, fmts[i]); if (parsed) break; }
      }
      if (!parsed) { parsed = new Date(params.dateValue); if (isNaN(parsed.getTime())) return { ok: false, error: 'Cannot parse: ' + params.dateValue }; }
      picker.value(parsed); picker.trigger('change');
      return { ok: true, value: picker.value() ? picker.value().toString() : 'set' };
    } catch(e) { return { ok: false, error: String(e) }; }
  }, { inputId: inputId, dateValue: dateValue });
  if (!result.ok) throw new Error('selectKendoDate failed on #' + inputId + ': ' + result.error);
  await page.waitForTimeout(400);
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
    await page.evaluate(async (params) => {
      var $ = (window as any).jQuery;
      var grid = $('#' + params.gridId).data('kendoGrid');
      try { grid.closeCell(); } catch(e) {}
      var cell = grid.tbody.find('tr').eq(params.row).find('td[data-field="' + params.dateField + '"]');
      grid.editCell(cell);
      for (var i = 0; i < 30; i++) { if (cell.find('input').length) break; await new Promise(function(r) { setTimeout(r, 100); }); }
      var dateInput = cell.find('input');
      if (dateInput.length) {
        var picker = dateInput.data('kendoDatePicker') || dateInput.data('kendoDateTimePicker');
        if (picker) { var d = new Date(); d.setDate(d.getDate() + params.startOffset + (params.row * params.rowSpacing)); picker.value(d); try { picker.trigger('change'); } catch(e) {} }
      }
      grid.closeCell();
    }, { gridId, row, dateField: paymentDateField, startOffset, rowSpacing });
    await page.waitForTimeout(1500);

    await page.evaluate(async (params) => {
      var $ = (window as any).jQuery;
      var grid = $('#' + params.gridId).data('kendoGrid');
      var daysForDue = parseInt($('#' + params.daysFieldId).val()) || 4;
      try { grid.closeCell(); } catch(e) {}
      var cell = grid.tbody.find('tr').eq(params.row).find('td[data-field="' + params.dateField + '"]');
      grid.editCell(cell);
      for (var i = 0; i < 30; i++) { if (cell.find('input').length) break; await new Promise(function(r) { setTimeout(r, 100); }); }
      var dateInput = cell.find('input');
      if (dateInput.length) {
        var picker = dateInput.data('kendoDatePicker') || dateInput.data('kendoDateTimePicker');
        if (picker) { var d = new Date(); d.setDate(d.getDate() + params.startOffset + (params.row * params.rowSpacing) + daysForDue); picker.value(d); try { picker.trigger('change'); } catch(e) {} }
      }
      grid.closeCell();
    }, { gridId, row, dateField: dueDateField, daysFieldId, startOffset, rowSpacing });
    await page.waitForTimeout(1500);
  }

  await page.evaluate((gid) => { var $ = (window as any).jQuery; try { $('#' + gid).data('kendoGrid').closeCell(); } catch(e) {} }, gridId);
  await page.waitForTimeout(1000);
  return rowCount;
}
