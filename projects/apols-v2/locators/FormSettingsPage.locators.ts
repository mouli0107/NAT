import { Page } from '@playwright/test';

export function FormSettingsPageLocators(page: Page) {
  return {
    formnameInput: page.locator('#FormName').first(),
    //  ↳ [name] xpath: //input[@name='application-form']

    updateVerificationCheckbox: page.locator('#UpdateVerification').first(),

    dateRangeRadio: page.locator('#dateRange').first(),

    feeEnabledCheckbox: page.locator('#FeeEnabled').first(),
    //  ↳ [name] xpath: //input[@name='FeeEnabled']

    amountInput: page.locator('#Amount').first(),
    //  ↳ [name] xpath: //input[@name='amount-form']

    fixedRadio: page.locator('#rdoFixed').first(),

    transactionFeeInput: page.locator('#transactionFee').first(),
    //  ↳ [name] xpath: //input[@name='transactionFee-form']

    perTransactionFeeInput: page.locator('#perTansactionFee').first(),
    //  ↳ [name] xpath: //input[@name='transactionFee-form']

    paymentPlanCheckbox: page.locator('#PaymentPlanEnabled').first(),
    //  ↳ [name] xpath: //input[@name='PaymentPlanEnabled']

    createPaymentPlanButton: page.locator('#btnCreatePaymentPlan').first(),

    paymentPlanNameInput: page.locator('#txtPaymentPlanName').first(),

    numberOfPaymentsInput: page.locator('#txtNoOfPayments').first(),

    nextPaymentButton: page.locator('#btnCreateFormPaymentPlan').first(),
    //  ↳ [button-text] xpath: //button[normalize-space(text())='NEXT']

    daysForPaymentInput: page.locator('#txtNoOfDaysforPaymentDue').first(),

    savePaymentPlanButton: page.locator('#btnSavePaymentPlan').first(),
    //  ↳ [button-text] xpath: //button[normalize-space(text())='Save']

    saveButton: page.locator('#btnSaveOnlineForms').first(),
    //  ↳ [button-text] xpath: //button[normalize-space(text())='SAVE']

    // KENDO: formStartDate — use selectKendoDate(page, 'formStartDate', dateValue)
    // KENDO: formEndDate — use selectKendoDate(page, 'formEndDate', dateValue)
    // KENDO: ddlFormSubmittedParent — use selectKendoDropdown(page, 'ddlFormSubmittedParent', optionText)
    // KENDO: ddlFormSubmittedSchool — use selectKendoDropdown(page, 'ddlFormSubmittedSchool', optionText)
    // KENDO: ddlSubmittedDate — use selectKendoDropdown(page, 'ddlSubmittedDate', optionText)
    // KENDO: ddlSubmittedTime — use selectKendoDropdown(page, 'ddlSubmittedTime', optionText)
  };
}

export type FormSettingsPageLocatorMap = ReturnType<typeof FormSettingsPageLocators>;
