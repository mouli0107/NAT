import { test, expect } from '@playwright/test';
import { prepareSite, waitForPageReady, clickNewTab, hoverAndWait, tryLocators, smartFill, smartClick, smartCheck, smartUncheck, kendoSelect, kendoSelectDate, kendoMultiSelectAdd, kendoTreeToggle, kendoTreeSelect } from '../helpers/universal';

test('Recorded flow', async ({ page, context }) => {
  // ─── Object Repository (auto-captured during recording) ─────────────────
  // Edit locators here — all test steps reference these named variables.
  const L = {
    emailInput          : page.locator('xpath=//*[@id=\'txtUserName\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='txtUserName']
    //  ↳ [name] xpath: //input[@name='email']
    //  ↳ [label-text] xpath: //label[normalize-space(text())='Enter your email']/following-sibling::input[1]
    //  ↳ [relative-structural] xpath: //*[@id='frmLogin']//input[@name='email']
    //  ↳ [attr-combo] xpath: //input[@type='email' and @name='email']
    passwordInput       : page.locator('xpath=//*[@id=\'txtUserPassword\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='txtUserPassword']
    //  ↳ [name] xpath: //input[@name='pwd']
    //  ↳ [label-text] xpath: //label[normalize-space(text())='Enter your password']/following-sibling::input[1]
    //  ↳ [relative-structural] xpath: //*[@id='frmLogin']//input[@name='pwd']
    //  ↳ [attr-combo] xpath: //input[@type='password' and @name='pwd']
    loginButton         : page.locator('xpath=//*[@id=\'btnLoginUser\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='btnLoginUser']
    //  ↳ [button-text] xpath: //button[normalize-space(text())='Login']
    //  ↳ [relative-structural] xpath: //*[@id='loginMainDiv']//button[normalize-space(text())='Login']
    addNewFormButton    : page.locator('xpath=//*[@id=\'btnNewForm\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='btnNewForm']
    //  ↳ [button-text] xpath: //button[normalize-space(text())='Add New Form']
    //  ↳ [relative-structural] xpath: //*[@id='frmCreateEdit']//button[normalize-space(text())='Add New Form']
    nextButton          : page.locator('xpath=//*[@id=\'btnSelectFormCreationNext\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='btnSelectFormCreationNext']
    //  ↳ [button-text] xpath: //button[normalize-space(text())='NEXT']
    //  ↳ [relative-structural] xpath: //*[@id='divSelectFormCreationWindow']//button[normalize-space(text())='NEXT']
    formnameInput       : page.locator('xpath=//*[@id=\'FormName\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='FormName']
    //  ↳ [name] xpath: //input[@name='application-form']
    //  ↳ [relative-structural] xpath: //*[@id='divFormControls']//input[@name='application-form']
    //  ↳ [attr-combo] xpath: //input[@type='form' and @name='application-form']
    submitFormFromParent: page.locator('xpath=//*[@id=\'divEmailTemplateType\']//span').filter({ visible: true }).first(),
    //  ↳ [relative-structural] xpath: //*[@id='divEmailTemplateType']//span
    formSubmittedSchool : page.locator('xpath=//*[@id=\'divEmailTemplateType\']//span').filter({ visible: true }).first(),
    //  ↳ [relative-structural] xpath: //*[@id='divEmailTemplateType']//span
    submittedDate       : page.locator('xpath=//*[@id=\'divFormControls\']//span').filter({ visible: true }).first(),
    //  ↳ [relative-structural] xpath: //*[@id='divFormControls']//span
    street              : page.locator('xpath=//*[@id=\'divFormControls\']//span').filter({ visible: true }).first(),
    //  ↳ [relative-structural] xpath: //*[@id='divFormControls']//span
    feeenabledCheckbox  : page.locator('xpath=//*[@id=\'FeeEnabled\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='FeeEnabled']
    //  ↳ [name] xpath: //input[@name='FeeEnabled']
    //  ↳ [relative-structural] xpath: //*[@id='divFormControls']//input[@name='FeeEnabled']
    //  ↳ [attr-combo] xpath: //input[@type='checkbox' and @name='FeeEnabled']
    amountInput         : page.locator('xpath=//*[@id=\'Amount\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='Amount']
    //  ↳ [name] xpath: //input[@name='amount-form']
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//input[@name='amount-form']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='amount-form']
    pertansactionfeeInput: page.locator('xpath=//*[@id=\'perTansactionFee\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='perTansactionFee']
    //  ↳ [name] xpath: //input[@name='transactionFee-form']
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//input[@name='transactionFee-form']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='transactionFee-form']
    birthDate           : page.locator('xpath=//*[@id=\'divEnableFeePayment\']//span').filter({ visible: true }).first(),
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//span
    city                : page.locator('xpath=//*[@id=\'divEnableFeePayment\']//span').filter({ visible: true }).first(),
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//span
    paymentplanenabledCheckbox: page.locator('xpath=//*[@id=\'PaymentPlanEnabled\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='PaymentPlanEnabled']
    //  ↳ [name] xpath: //input[@name='PaymentPlanEnabled']
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//input[@name='PaymentPlanEnabled']
    //  ↳ [attr-combo] xpath: //input[@type='checkbox' and @name='PaymentPlanEnabled']
    saveButton          : page.locator('xpath=//*[@id=\'btnSaveOnlineForms\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='btnSaveOnlineForms']
    //  ↳ [button-text] xpath: //button[normalize-space(text())='SAVE']
    //  ↳ [relative-structural] xpath: //*[@id='frmAddEditForm']//button[normalize-space(text())='SAVE']
  };

  await page.goto('https://ap-forms.rediker.com/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE');
  await prepareSite(page); // dismiss overlays, wait for URL stability

  await page.waitForURL('**https://ap-forms.rediker.com/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE');
  await smartFill(L.emailInput, 'mahimagp@nousinfo.com');
  await smartFill(L.passwordInput, 'Mahima123');
  await smartClick(L.loginButton);
  await page.waitForURL('**https://ap-forms.rediker.com/FormsManager/CreateEditForms');
  await smartClick(L.addNewFormButton);
  await smartClick(L.nextButton);
  await page.waitForURL('**https://ap-forms.rediker.com/FormsManager/FormSettings');
  await smartFill(L.formnameInput, 'testingnewest');
  await kendoSelect(page, page.locator('.k-dropdownlist:has-text("To Parent"), .k-combobox:has-text("To Parent")').first(), 'Submit Form From Parent');
  await kendoSelect(page, page.locator('.k-dropdownlist:has-text("To Parent"), .k-combobox:has-text("To Parent")').first(), 'Submit Form From Parent');
  await kendoSelect(page, page.locator('.k-dropdownlist:has-text("To Parent"), .k-combobox:has-text("To Parent")').first(), 'Submit Form From Parent');
  await kendoSelect(page, page.locator('.k-dropdownlist:has-text("To School"), .k-combobox:has-text("To School")').first(), 'Form Submitted School');
  await kendoSelect(page, page.locator('.k-dropdownlist:has-text("To School"), .k-combobox:has-text("To School")').first(), 'Form Submitted School');
  await kendoSelect(page, page.locator('.k-dropdownlist:has-text("To School"), .k-combobox:has-text("To School")').first(), 'Form Submitted School');
  await kendoSelect(page, L.submittedDate, 'Submitted date');
  await kendoSelect(page, L.submittedDate, 'Submitted date');
  await kendoSelect(page, L.submittedDate, 'Submitted date');
  await kendoSelect(page, L.street, 'Street');
  await kendoSelect(page, L.street, 'Street');
  await kendoSelect(page, L.street, 'Street');
  await smartCheck(L.feeenabledCheckbox);
  await smartFill(L.amountInput, '1000');
  await smartFill(L.pertansactionfeeInput, '100');
  await kendoSelect(page, L.birthDate, 'Birth Date');
  await kendoSelect(page, L.birthDate, 'Birth Date');
  await kendoSelect(page, L.birthDate, 'Birth Date');
  await kendoSelect(page, L.city, 'City');
  await kendoSelect(page, L.city, 'City');
  await kendoSelect(page, L.city, 'City');
  await kendoSelect(page, page.locator('.k-dropdownlist:has-text("ddlAmountPaid"), .k-combobox:has-text("ddlAmountPaid")').first(), 'City');
  await kendoSelect(page, page.locator('.k-dropdownlist:has-text("ddlAmountPaid"), .k-combobox:has-text("ddlAmountPaid")').first(), 'City');
  await kendoSelect(page, page.locator('.k-dropdownlist:has-text("ddlAmountPaid"), .k-combobox:has-text("ddlAmountPaid")').first(), 'City');
  await smartCheck(L.paymentplanenabledCheckbox);
  await smartClick(L.saveButton);
  await page.waitForURL('**https://ap-forms.rediker.com/FormsManager/CreateEditPages?formId=1361&formTypeId=1');
});