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
    formName            : page.locator('xpath=//*[@id=\'divFormControls\']//div').filter({ visible: true }).first(),
    //  ↳ [relative-structural] xpath: //*[@id='divFormControls']//div
    formnameInput       : page.locator('xpath=//*[@id=\'FormName\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='FormName']
    //  ↳ [name] xpath: //input[@name='application-form']
    //  ↳ [relative-structural] xpath: //*[@id='divFormControls']//input[@name='application-form']
    //  ↳ [attr-combo] xpath: //input[@type='form' and @name='application-form']
    ddlformsubmittedparentInput: page.locator('xpath=//*[@id=\'ddlFormSubmittedParent\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='ddlFormSubmittedParent']
    //  ↳ [name] xpath: //input[@name='ddlFormSubmittedParent']
    //  ↳ [relative-structural] xpath: //*[@id='divEmailTemplateType']//input[@name='ddlFormSubmittedParent']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='ddlFormSubmittedParent']
    ddlformsubmittedschoolInput: page.locator('xpath=//*[@id=\'ddlFormSubmittedSchool\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='ddlFormSubmittedSchool']
    //  ↳ [name] xpath: //input[@name='ddlFormSubmittedSchool']
    //  ↳ [relative-structural] xpath: //*[@id='divEmailTemplateType']//input[@name='ddlFormSubmittedSchool']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='ddlFormSubmittedSchool']
    ddlsubmitteddateInput: page.locator('xpath=//*[@id=\'ddlSubmittedDate\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='ddlSubmittedDate']
    //  ↳ [name] xpath: //input[@name='ddlSubmittedDate']
    //  ↳ [relative-structural] xpath: //*[@id='divFormControls']//input[@name='ddlSubmittedDate']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='ddlSubmittedDate']
    ddlsubmittedtimeInput: page.locator('xpath=//*[@id=\'ddlSubmittedTime\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='ddlSubmittedTime']
    //  ↳ [name] xpath: //input[@name='ddlSubmittedTime']
    //  ↳ [relative-structural] xpath: //*[@id='divFormControls']//input[@name='ddlSubmittedTime']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='ddlSubmittedTime']
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
    perTransactionFee   : page.locator('xpath=//*[@id=\'divEnableFeePayment\']//div').filter({ visible: true }).first(),
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//div
    pertansactionfeeInput: page.locator('xpath=//*[@id=\'perTansactionFee\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='perTansactionFee']
    //  ↳ [name] xpath: //input[@name='transactionFee-form']
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//input[@name='transactionFee-form']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='transactionFee-form']
    ddlpaymentdateInput : page.locator('xpath=//*[@id=\'ddlPaymentDate\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='ddlPaymentDate']
    //  ↳ [name] xpath: //input[@name='ddlPaymentDate']
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//input[@name='ddlPaymentDate']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='ddlPaymentDate']
    ddltransactionidInput: page.locator('xpath=//*[@id=\'ddlTransactionId\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='ddlTransactionId']
    //  ↳ [name] xpath: //input[@name='ddlTransactionId']
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//input[@name='ddlTransactionId']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='ddlTransactionId']
    ddlamountpaidInput  : page.locator('xpath=//*[@id=\'ddlAmountPaid\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='ddlAmountPaid']
    //  ↳ [name] xpath: //input[@name='ddlAmountPaid']
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//input[@name='ddlAmountPaid']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='ddlAmountPaid']
    enablePaymentPlanForThisForm: page.locator('xpath=//*[@id=\'divEnableFeePayment\']//div').filter({ visible: true }).first(),
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//div
    paymentplanenabledCheckbox: page.locator('xpath=//*[@id=\'PaymentPlanEnabled\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='PaymentPlanEnabled']
    //  ↳ [name] xpath: //input[@name='PaymentPlanEnabled']
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//input[@name='PaymentPlanEnabled']
    //  ↳ [attr-combo] xpath: //input[@type='checkbox' and @name='PaymentPlanEnabled']
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
  await smartClick(page.getByText('Form Name', { exact: false }).filter({ visible: true }).first());
  await smartFill(L.formnameInput, 'adarsh');
  await kendoSelect(page, page.locator('.k-dropdownlist:has-text("To Parent"), .k-combobox:has-text("To Parent")').first(), 'Submit Form From Parent');
  await kendoSelect(page, page.locator('.k-dropdownlist:has-text("To School"), .k-combobox:has-text("To School")').first(), 'Form Submitted School');
  await kendoSelect(page, L.ddlsubmitteddateInput, 'Submitted date');
  await kendoSelect(page, L.ddlsubmittedtimeInput, 'City');
  await smartCheck(L.feeenabledCheckbox);
  await smartFill(L.amountInput, '1000');
  await smartClick(L.perTransactionFee);
  await smartFill(L.pertansactionfeeInput, '10');
  await kendoSelect(page, L.ddlpaymentdateInput, 'Birth Date');
  await kendoSelect(page, L.ddltransactionidInput, 'Parent/Guardian');
  await kendoSelect(page, L.ddlamountpaidInput, 'State');
  await smartClick(L.enablePaymentPlanForThisForm);
  await smartCheck(L.paymentplanenabledCheckbox);
});