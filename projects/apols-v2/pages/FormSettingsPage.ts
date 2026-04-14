import { Page } from '@playwright/test';
import { FormSettingsPageLocators } from '../locators/FormSettingsPage.locators';
import { smartFill, smartClick, smartCheck } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export class FormSettingsPage {
  private page: Page;
  private L: ReturnType<typeof FormSettingsPageLocators>;

  constructor(page: Page) {
    this.page = page;
    this.L = FormSettingsPageLocators(page);
  }

  async fillFormName(name: string) {
    await smartFill(this.L.formnameInput, name);
  }

  async enableDateRange() {
    await smartClick(this.L.dateRangeRadio);
    await smartCheck(this.L.dateRangeRadio);
    await this.page.waitForTimeout(2000);
  }

  async setFromDate(dateValue: string) {
    await this._safeSetKendoDate('formStartDate', dateValue);
  }

  async setToDate(dateValue: string) {
    await this._safeSetKendoDate('formEndDate', dateValue);
  }

  /**
   * Set Kendo DateTimePicker value WITHOUT calling picker.enable(true)
   * which triggers APOLF's broken "startDate is not defined" error.
   */
  private async _safeSetKendoDate(inputId: string, dateValue: string) {
    await this.page.waitForFunction((id) => {
      const $ = (window as any).jQuery;
      if (!$) return false;
      return !!($('#' + id).data('kendoDateTimePicker') || $('#' + id).data('kendoDatePicker'));
    }, inputId, { timeout: 10000 });

    const result = await this.page.evaluate((params) => {
      try {
        const $ = (window as any).jQuery;
        const el = $('#' + params.inputId);
        const picker = el.data('kendoDateTimePicker') || el.data('kendoDatePicker');
        if (!picker) return { ok: false, error: 'No picker on #' + params.inputId };
        // DO NOT call picker.enable(true) — it triggers APOLF's broken startDate reference
        const k = (window as any).kendo;
        let parsed: Date | null = null;
        if (k && k.parseDate) {
          const fmts = ['MM-dd-yyyy hh:mm tt', 'MM/dd/yyyy hh:mm tt', 'MM-dd-yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'];
          for (const fmt of fmts) { parsed = k.parseDate(params.dateValue, fmt); if (parsed) break; }
        }
        if (!parsed) { parsed = new Date(params.dateValue); if (isNaN(parsed.getTime())) return { ok: false, error: 'Cannot parse: ' + params.dateValue }; }
        picker.value(parsed);
        try { picker.trigger('change'); } catch (_) { /* APOLF startDate bug — ignore */ }
        return { ok: true, value: picker.value() ? picker.value().toString() : 'set' };
      } catch (e: any) { return { ok: false, error: String(e) }; }
    }, { inputId, dateValue });

    if (!result.ok) throw new Error('_safeSetKendoDate failed on #' + inputId + ': ' + result.error);
    await this.page.waitForTimeout(400);
  }

  async selectEmailTemplateParent(optionText: string) {
    await selectKendoDropdown(this.page, 'ddlFormSubmittedParent', optionText);
  }

  async selectEmailTemplateSchool(optionText: string) {
    await selectKendoDropdown(this.page, 'ddlFormSubmittedSchool', optionText);
  }

  async selectSubmittedDateField(optionText: string) {
    await selectKendoDropdown(this.page, 'ddlSubmittedDate', optionText);
  }

  async selectSubmittedTimeField(optionText: string) {
    await selectKendoDropdown(this.page, 'ddlSubmittedTime', optionText);
  }

  async enableFeePayment() {
    await smartCheck(this.L.feeEnabledCheckbox);
  }

  async setBaseAmount(amount: string) {
    await smartFill(this.L.amountInput, amount);
  }

  async selectFixedFeeType() {
    await smartClick(this.L.fixedRadio);
    await smartCheck(this.L.fixedRadio);
  }

  async setTransactionFee(fee: string) {
    await smartFill(this.L.transactionFeeInput, fee);
  }

  async setPerTransactionFee(fee: string) {
    await smartFill(this.L.perTransactionFeeInput, fee);
  }

  async enablePaymentPlan() {
    await smartCheck(this.L.paymentPlanCheckbox);
  }

  async createPaymentPlan(name: string, payments: string, days: string) {
    await smartClick(this.L.createPaymentPlanButton);
    await smartFill(this.L.paymentPlanNameInput, name);
    await smartFill(this.L.numberOfPaymentsInput, payments);
    await smartClick(this.L.nextPaymentButton);
    await smartFill(this.L.daysForPaymentInput, days);
    await fillKendoGridDates(this.page, 'gridPaymentPlan', 'txtNoOfDaysforPaymentDue');
    await smartClick(this.L.savePaymentPlanButton);
    await waitAndDismissAnyKendoAlert(this.page);
    // Dismiss any Bootstrap modal that may appear (e.g., "Form saved" confirmation)
    await this.page.locator('#modal-warning.in button, #modal-warning.in .btn').first()
      .click({ timeout: 3000 }).catch(() => {});
    await this.page.waitForTimeout(500);
  }

  async save() {
    // Dismiss any lingering modals before clicking save
    await this.page.locator('#modal-warning.in button, #modal-warning.in .btn').first()
      .click({ timeout: 2000 }).catch(() => {});
    await this.page.waitForTimeout(300);
    await smartClick(this.L.saveButton);
    await waitAndDismissAnyKendoAlert(this.page);
  }
}
