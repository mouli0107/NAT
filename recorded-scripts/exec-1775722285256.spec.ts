import { test, expect } from '@playwright/test';
import { prepareSite, waitForPageReady, clickNewTab, hoverAndWait, tryLocators, smartFill, smartClick, smartCheck, smartUncheck } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, checkKendoTreeNode, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

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
    percentageorfixedRadio: page.locator('xpath=//*[@id=\'rdoFixed\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='rdoFixed']
    //  ↳ [name] xpath: //input[@name='PercentageOrFixed']
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//input[@name='PercentageOrFixed']
    //  ↳ [attr-combo] xpath: //input[@type='radio' and @name='PercentageOrFixed']
    transactionfeeInput : page.locator('xpath=//*[@id=\'transactionFee\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='transactionFee']
    //  ↳ [name] xpath: //input[@name='transactionFee-form']
    //  ↳ [relative-structural] xpath: //*[@id='divTransactionFee']//input[@name='transactionFee-form']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='transactionFee-form']
    pertansactionfeeInput: page.locator('xpath=//*[@id=\'perTansactionFee\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='perTansactionFee']
    //  ↳ [name] xpath: //input[@name='transactionFee-form']
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//input[@name='transactionFee-form']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='transactionFee-form']
    paymentplanenabledCheckbox: page.locator('xpath=//*[@id=\'PaymentPlanEnabled\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='PaymentPlanEnabled']
    //  ↳ [name] xpath: //input[@name='PaymentPlanEnabled']
    //  ↳ [relative-structural] xpath: //*[@id='divEnableFeePayment']//input[@name='PaymentPlanEnabled']
    //  ↳ [attr-combo] xpath: //input[@type='checkbox' and @name='PaymentPlanEnabled']
    btncreatepaymentplanButton: page.locator('xpath=//*[@id=\'btnCreatePaymentPlan\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='btnCreatePaymentPlan']
    //  ↳ [relative-structural] xpath: //*[@id='divAvailablePaymentPlans']//input
    txtpaymentplannameInput: page.locator('xpath=//*[@id=\'txtPaymentPlanName\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='txtPaymentPlanName']
    //  ↳ [name] xpath: //input[@name='txtPaymentPlanName']
    //  ↳ [relative-structural] xpath: //*[@id='divFormPaymentPlansWindow']//input[@name='txtPaymentPlanName']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='txtPaymentPlanName']
    txtnoofpaymentsInput: page.locator('xpath=//*[@id=\'txtNoOfPayments\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='txtNoOfPayments']
    //  ↳ [name] xpath: //input[@name='txtNoOfPayments']
    //  ↳ [relative-structural] xpath: //*[@id='divFormPaymentPlansWindow']//input[@name='txtNoOfPayments']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='txtNoOfPayments']
    nextButton2         : page.locator('xpath=//*[@id=\'btnCreateFormPaymentPlan\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='btnCreateFormPaymentPlan']
    //  ↳ [button-text] xpath: //button[normalize-space(text())='NEXT']
    //  ↳ [relative-structural] xpath: //*[@id='divFormPaymentPlansWindow']//button[normalize-space(text())='NEXT']
    txtnoofdaysforpaymentdueInput: page.locator('xpath=//*[@id=\'txtNoOfDaysforPaymentDue\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='txtNoOfDaysforPaymentDue']
    //  ↳ [name] xpath: //input[@name='txtNoOfDaysforPaymentDue']
    //  ↳ [relative-structural] xpath: //*[@id='divPaymentPlansWindow']//input[@name='txtNoOfDaysforPaymentDue']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='txtNoOfDaysforPaymentDue']
    varSelformatsVarIsvalidFalse: page.locator('xpath=//*[@id=\'gridPaymentPlan_active_cell\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='gridPaymentPlan_active_cell']
    //  ↳ [relative-structural] xpath: //*[@id='gridPaymentPlan']//td
    paymentdateInput    : page.locator('xpath=//*[@id=\'PaymentDate\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='PaymentDate']
    //  ↳ [name] xpath: //input[@name='PaymentDate']
    //  ↳ [relative-structural] xpath: //*[@id='gridPaymentPlan_active_cell']//input[@name='PaymentDate']
    //  ↳ [attr-combo] xpath: //input[@type='text' and @name='PaymentDate']
    saveButton          : page.locator('xpath=//*[@id=\'btnSavePaymentPlan\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='btnSavePaymentPlan']
    //  ↳ [button-text] xpath: //button[normalize-space(text())='Save']
    //  ↳ [relative-structural] xpath: //*[@id='divPaymentPlansWindow']//button[normalize-space(text())='Save']
    saveButton2         : page.locator('xpath=//*[@id=\'btnSaveOnlineForms\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='btnSaveOnlineForms']
    //  ↳ [button-text] xpath: //button[normalize-space(text())='SAVE']
    //  ↳ [relative-structural] xpath: //*[@id='frmAddEditForm']//button[normalize-space(text())='SAVE']
    page2               : page.locator('xpath=//*[@id=\'1450\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='1450']
    //  ↳ [relative-structural] xpath: //*[@id='tabPages']//li[@name='Page 2']
    fngetdeletestatusLink: page.locator('xpath=//*[@id=\'fnGetDeleteStatus\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='fnGetDeleteStatus']
    //  ↳ [relative-structural] xpath: //*[@id='divEditPage']//a
    yesButton           : page.locator('xpath=//*[@id=\'okButton\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='okButton']
    //  ↳ [button-text] xpath: //button[normalize-space(text())='YES']
    //  ↳ [relative-structural] xpath: //*[@id='modal-warning']//button[normalize-space(text())='YES']
    page3               : page.locator('xpath=//*[@id=\'1451\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='1451']
    //  ↳ [relative-structural] xpath: //*[@id='tabPages']//li[@name='Page 3']
    page4               : page.locator('xpath=//*[@id=\'1452\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='1452']
    //  ↳ [relative-structural] xpath: //*[@id='tabPages']//li[@name='Page 4']
    addMultipleQuestionsButton: page.locator('xpath=//button[normalize-space(text())=\'Add Multiple Questions\']').filter({ visible: true }).first(),
    //  ↳ [button-text] xpath: //button[normalize-space(text())='Add Multiple Questions']
    //  ↳ [relative-structural] xpath: //*[@id='SectionsPanel1449']//button[normalize-space(text())='Add Multiple Questions']
    deselectAllRowsCheckbox: page.locator('xpath=//*[@id=\'FieldMasterGridaa449c77-e15b-40d5-a79f-e48459256520\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='FieldMasterGridaa449c77-e15b-40d5-a79f-e48459256520']
    //  ↳ [aria-label] xpath: //input[@aria-label='Deselect all rows']
    //  ↳ [label-text] xpath: //label[normalize-space(text())='​']/following-sibling::input[1]
    //  ↳ [relative-structural] xpath: //*[@id='FieldMasterGrid']//input
    saveButton3         : page.locator('xpath=//*[@id=\'btnSaveFieldQuestions\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='btnSaveFieldQuestions']
    //  ↳ [button-text] xpath: //button[normalize-space(text())='SAVE']
    //  ↳ [relative-structural] xpath: //*[@id='divAddFieldMasterQuestion']//button[normalize-space(text())='SAVE']
    createEditFormLink  : page.locator('xpath=//*[@id=\'linkBackToForms\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='linkBackToForms']
    //  ↳ [link-text] xpath: //a[normalize-space(text())='Create/Edit Form']
    sendButton          : page.locator('xpath=//button[normalize-space(text())=\'Send\']').filter({ visible: true }).first(),
    //  ↳ [button-text] xpath: //button[normalize-space(text())='Send']
    //  ↳ [relative-structural] xpath: //*[@id='frameButtons']//button[normalize-space(text())='Send']
    deselectAllRowsCheckbox2: page.locator('xpath=//*[@id=\'GridStudentDetails5c7691f3-3235-4140-bebe-79b06c892001\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='GridStudentDetails5c7691f3-3235-4140-bebe-79b06c892001']
    //  ↳ [aria-label] xpath: //input[@aria-label='Deselect all rows']
    //  ↳ [label-text] xpath: //label[normalize-space(text())='​']/following-sibling::input[1]
    allandprimaryonlyRadio: page.locator('xpath=//*[@id=\'rdoAll\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='rdoAll']
    //  ↳ [name] xpath: //input[@name='AllAndPrimaryOnly']
    //  ↳ [relative-structural] xpath: //*[@id='divHouseHoldContact']//input[@name='AllAndPrimaryOnly']
    //  ↳ [attr-combo] xpath: //input[@type='radio' and @name='AllAndPrimaryOnly']
    publishButton       : page.locator('xpath=//*[@id=\'btnPublish\']').filter({ visible: true }).first(),
    //  ↳ [id] xpath: //*[@id='btnPublish']
    //  ↳ [button-text] xpath: //button[normalize-space(text())='Publish']
    //  ↳ [relative-structural] xpath: //*[@id='divPublish']//button[normalize-space(text())='Publish']
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
  await smartFill(L.formnameInput, 'Test_' + Date.now());
  await smartCheck(L.feeenabledCheckbox);
  await smartFill(L.amountInput, '1000');
  await smartClick(L.percentageorfixedRadio);
  await smartCheck(L.percentageorfixedRadio);
  await smartFill(L.transactionfeeInput, '3');
  await smartFill(L.pertansactionfeeInput, '3');
  await smartCheck(L.paymentplanenabledCheckbox);
  await smartClick(L.btncreatepaymentplanButton);
  await smartFill(L.txtpaymentplannameInput, 'pl');
  await smartFill(L.txtnoofpaymentsInput, '3');
  await smartClick(L.nextButton2);
  await smartFill(L.txtnoofdaysforpaymentdueInput, '4');
  await fillKendoGridDates(page, 'gridPaymentPlan', 'txtNoOfDaysforPaymentDue');

  await fillKendoGridDates(page, 'gridPaymentPlan', 'txtNoOfDaysforPaymentDue');

  



  await smartClick(L.saveButton);
  await waitAndDismissAnyKendoAlert(page);
  await smartClick(L.saveButton2);
  await waitAndDismissAnyKendoAlert(page);

  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/FormsManager/CreateEditPages**');
  await smartClick(page.locator('.k-tabstrip .k-item:has-text("Page 2"), [role="tab"]:has-text("Page 2")').first());
  await smartClick(L.fngetdeletestatusLink);
  await smartClick(L.yesButton);
  await waitAndDismissAnyKendoAlert(page);
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/FormsManager/CreateEditPages**');
  await smartClick(page.locator('.k-tabstrip .k-item:has-text("Page 3"), [role="tab"]:has-text("Page 3")').first());
  await smartClick(L.fngetdeletestatusLink);
  await smartClick(L.yesButton);
  await waitAndDismissAnyKendoAlert(page);
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/FormsManager/CreateEditPages**');
  await smartClick(page.locator('.k-tabstrip .k-item:has-text("Page 4"), [role="tab"]:has-text("Page 4")').first());
  await smartClick(L.fngetdeletestatusLink);
  await smartClick(L.yesButton);
  await waitAndDismissAnyKendoAlert(page);
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/FormsManager/CreateEditPages**');
  await smartClick(L.addMultipleQuestionsButton);
  await page.waitForTimeout(2000);

  // Click the "Select All" header checkbox in the FieldMasterGrid
  await page.evaluate(() => {
    var $ = (window as any).jQuery;
    var headerCheckbox = $('#FieldMasterGrid .k-grid-header input[type="checkbox"]');
    if (headerCheckbox.length) {
      headerCheckbox.click();
    } else {
      // Fallback: find any header checkbox in visible grid
      var cb = $('th input[type="checkbox"]:visible').first();
      if (cb.length) cb.click();
    }
  });
  await page.waitForTimeout(1000);

  await smartClick(L.saveButton3);
  await waitAndDismissAnyKendoAlert(page);
  await page.waitForTimeout(2000);

  // Navigate back to Create/Edit Forms using the sidebar menu instead of the breadcrumb link
  await page.locator('a[href="/FormsManager/CreateEditForms"]').first().click();
  await page.waitForURL('**/FormsManager/CreateEditForms', { waitUntil: 'domcontentloaded' });



  await smartClick(L.sendButton);
  await page.waitForURL('**/FormsManager/SendGenericForm', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

    // Click Add Recipients to load the student grid
    await page.locator('#btnLoadRecipients').click();
    await page.waitForTimeout(3000);
  
        // Filter the grid by name using Kendo Grid API
        await page.evaluate(() => {
          var $ = (window as any).jQuery;
          var grid = $('#GridStudentDetails').data('kendoGrid');
          grid.dataSource.filter({
            field: 'StudentName',
            operator: 'contains',
            value: 'lince'
          });
        });
        await page.waitForTimeout(2000);
    
        // Select all filtered results
        await page.evaluate(() => {
          var $ = (window as any).jQuery;
          var checkboxes = $('#GridStudentDetails tbody input[type="checkbox"]');
          for (var i = 0; i < checkboxes.length; i++) {
            if (!$(checkboxes[i]).is(':checked')) $(checkboxes[i]).click();
          }
        });
    
        await page.waitForTimeout(1000);
    
        // Select "All" contacts radio
        await page.locator('#rdoAll').check({ force: true }).catch(async () => {
          await page.evaluate(() => {
            var el = document.getElementById('rdoAll');
            if (el) (el as HTMLInputElement).click();
          });
        });
        await page.waitForTimeout(500);
    
        // Publish
        await smartClick(L.publishButton);
        await waitAndDismissAnyKendoAlert(page);
        await page.waitForTimeout(5000);
    
});