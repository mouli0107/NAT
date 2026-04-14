import { Page } from '@playwright/test';
import { FormSettingsPageLocators } from '../locators/FormSettingsPage.locators';
import { smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, checkKendoTreeNode, fillKendoGridDates, waitAndDismissAnyKendoAlert } from '../helpers/kendo';
export class FormSettingsPage {
  private page: Page;
  private L: ReturnType<typeof FormSettingsPageLocators>;
  constructor(page: Page) {
    this.page = page;
    this.L = FormSettingsPageLocators(page);
  }
  async fillFormname(value: string) {
    await smartFill(this.L.formnameInput, value);
  }
  async enableFeeenabled() {
    await smartCheck(this.L.feeenabledCheckbox);
  }
  async fillAmount(value: string) {
    await smartFill(this.L.amountInput, value);
  }
  async enableRdofixed() {
    await smartCheck(this.L.percentageorfixedCheckbox);
  }
  async fillTransactionfee(value: string) {
    await smartFill(this.L.transactionfeeInput, value);
  }
  async fillPertansactionfee(value: string) {
    await smartFill(this.L.pertansactionfeeInput, value);
  }
  async enablePaymentplanenabled() {
    await smartCheck(this.L.paymentplanenabledCheckbox);
  }
  async fillBtncreatepaymentplan(value: string) {
    await smartFill(this.L.btncreatepaymentplanButton, value);
  }
  async clickTxtpaymentplanname() {
    await smartClick(this.L.txtpaymentplannameInput);
  }
  async fillTxtpaymentplanname(value: string) {
    await smartFill(this.L.txtpaymentplannameInput, value);
  }
  async fillTxtnoofpayments(value: string) {
    await smartFill(this.L.txtnoofpaymentsInput, value);
  }
  async clickNext() {
    await smartClick(this.L.nextButton);
  }
  async clickTxtnoofdaysforpaymentdue() {
    await smartClick(this.L.txtnoofdaysforpaymentdueInput);
  }
  async fillTxtnoofdaysforpaymentdue(value: string) {
    await smartFill(this.L.txtnoofdaysforpaymentdueInput, value);
  }
  async fillPaymentdate(value: string) {
    await smartFill(this.L.paymentdateInput, value);
  }
  async clickSave() {
    await smartClick(this.L.saveButton);
    await waitAndDismissAnyKendoAlert(this.page);
  }
}