import { test, expect } from '@playwright/test';
import { prepareSite, waitForPageReady, clickNewTab, hoverAndWait, tryLocators, smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, checkKendoTreeNode } from '../helpers/kendo';

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
    formstatusRadio     : page.locator('xpath=//*[@id=\'dateRange\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='dateRange']
    //  ↳ [name] xpath: //input[@name='formStatus']
    //  ↳ [relative-structural] xpath: //*[@id='divTimeFrame']//input[@name='formStatus']
    //  ↳ [attr-combo] xpath: //input[@type='radio' and @name='formStatus']
    formstartdateInput  : page.locator('xpath=//*[@id=\'formStartDate\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='formStartDate']
    //  ↳ [name] xpath: //input[@name='formStartDate']
    //  ↳ [relative-structural] xpath: //*[@id='divTimeFrame']//input[@name='formStartDate']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='formStartDate']
    formenddateSelect   : page.locator('#formEndDate').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='formEndDate']
    //  ↳ [kendo-wrapper] xpath: //span[@aria-owns='formEndDate_listbox']
    ddlformsubmittedparentSelect: page.locator('#ddlFormSubmittedParent').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='ddlFormSubmittedParent']
    //  ↳ [kendo-wrapper] xpath: //span[@aria-owns='ddlFormSubmittedParent_listbox']
    ddlformsubmittedschoolSelect: page.locator('#ddlFormSubmittedSchool').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='ddlFormSubmittedSchool']
    //  ↳ [kendo-wrapper] xpath: //span[@aria-owns='ddlFormSubmittedSchool_listbox']
    ddlsubmitteddateSelect: page.locator('#ddlSubmittedDate').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='ddlSubmittedDate']
    //  ↳ [kendo-wrapper] xpath: //span[@aria-owns='ddlSubmittedDate_listbox']
    ddlsubmittedtimeSelect: page.locator('#ddlSubmittedTime').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='ddlSubmittedTime']
    //  ↳ [kendo-wrapper] xpath: //span[@aria-owns='ddlSubmittedTime_listbox']
    feeenabledCheckbox  : page.locator('xpath=//*[@id=\'FeeEnabled\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='FeeEnabled']
    //  ↳ [name] xpath: //input[@name='FeeEnabled']
    //  ↳ [relative-structural] xpath: //*[@id='divFormControls']//input[@name='FeeEnabled']
    //  ↳ [attr-combo] xpath: //input[@type='checkbox' and @name='FeeEnabled']
    ddlpaymentdateSelect: page.locator('#ddlPaymentDate').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='ddlPaymentDate']
    //  ↳ [kendo-wrapper] xpath: //span[@aria-owns='ddlPaymentDate_listbox']
    ddltransactionidSelect: page.locator('#ddlTransactionId').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='ddlTransactionId']
    //  ↳ [kendo-wrapper] xpath: //span[@aria-owns='ddlTransactionId_listbox']
    ddlamountpaidSelect : page.locator('#ddlAmountPaid').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='ddlAmountPaid']
    //  ↳ [kendo-wrapper] xpath: //span[@aria-owns='ddlAmountPaid_listbox']
    paymentplanenabledCheckbox: page.locator('xpath=//*[@id=\'PaymentPlanEnabled\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='PaymentPlanEnabled']
    //  ↳ [name] xpath: //input[@name='PaymentPlanEnabled']
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//input[@name='PaymentPlanEnabled']
    //  ↳ [attr-combo] xpath: //input[@type='checkbox' and @name='PaymentPlanEnabled']
    deposittypeRadio    : page.locator('xpath=//*[@id=\'rdoPercentageDeposit\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='rdoPercentageDeposit']
    //  ↳ [name] xpath: //input[@name='DepositType']
    //  ↳ [relative-structural] xpath: //*[@id='divDeposit']//input[@name='DepositType']
    //  ↳ [attr-combo] xpath: //input[@type='radio' and @name='DepositType']
    depositamountInput  : page.locator('xpath=//*[@id=\'DepositAmount\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='DepositAmount']
    //  ↳ [name] xpath: //input[@name='amount-form']
    //  ↳ [relative-structural] xpath: //*[@id='divDeposit']//input[@name='amount-form']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='amount-form']
    saveButton          : page.locator('xpath=//*[@id=\'btnSaveOnlineForms\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='btnSaveOnlineForms']
    //  ↳ [button-text] xpath: //button[normalize-space(text())='SAVE']
    //  ↳ [relative-structural] xpath: //*[@id='frmAddEditForm']//button[normalize-space(text())='SAVE']
    doneButton          : page.locator('xpath=//*[@id=\'okButton\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='okButton']
    //  ↳ [button-text] xpath: //button[normalize-space(text())='DONE']
    //  ↳ [relative-structural] xpath: //*[@id='modal-warning']//button[normalize-space(text())='DONE']
    amountInput         : page.locator('xpath=//*[@id=\'Amount\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='Amount']
    //  ↳ [name] xpath: //input[@name='amount-form']
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//input[@name='amount-form']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='amount-form']
  };

  await page.goto('https://apolf-web-preprod.azurewebsites.net/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE');
  await prepareSite(page); // dismiss overlays, wait for URL stability

  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE');
  await smartFill(L.emailInput, 'mahimagp@nousinfo.com');
  await smartFill(L.passwordInput, 'Mahima123');
  await smartClick(L.loginButton);
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/FormsManager/CreateEditForms');
  await smartClick(L.addNewFormButton);
  await smartClick(L.nextButton);
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/FormsManager/FormSettings');
  await smartFill(L.formnameInput, 'sasika');
  await smartClick(L.formstatusRadio);
  await smartCheck(L.formstatusRadio);
  await selectKendoDate(page, 'formEndDate', '04-10-2026 12:00 AM');
  await selectKendoDropdown(page, 'ddlFormSubmittedParent', 'Submit Form From Parent');
  await selectKendoDropdown(page, 'ddlFormSubmittedSchool', 'Form Submitted School');
  await selectKendoDropdown(page, 'ddlSubmittedDate', 'Birth Date');
  await selectKendoDropdown(page, 'ddlSubmittedTime', 'Parent/Guardian');
  await smartCheck(L.feeenabledCheckbox);
  await selectKendoDropdown(page, 'ddlPaymentDate', 'Birth Date');
  await selectKendoDropdown(page, 'ddlTransactionId', 'State');
  await selectKendoDropdown(page, 'ddlAmountPaid', 'State');
  await smartCheck(L.paymentplanenabledCheckbox);
  await smartClick(L.deposittypeRadio);
  await smartCheck(L.deposittypeRadio);
  await smartFill(L.depositamountInput, '44');
  await smartClick(L.saveButton);
  await smartClick(L.doneButton);
  await smartFill(L.amountInput, '3434');
  await smartClick(L.saveButton);
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/FormsManager/CreateEditPages?formId=364&formTypeId=1');
  await smartClick(page.locator('xpath=//a[normalize-space(text())=\'a\']').filter({ visible: true }).first());
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE');
});