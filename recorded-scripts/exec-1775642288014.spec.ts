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
    submitFormFromParent: page.locator('xpath=//*[@id=\'ddlFormSubmittedParent_listbox\']//li').filter({ visible: true }).first(),
    //  ↳ [relative-structural] xpath: //*[@id='ddlFormSubmittedParent_listbox']//li
    formSubmittedSchool : page.locator('xpath=//*[@id=\'ddlFormSubmittedSchool_listbox\']//li').filter({ visible: true }).first(),
    //  ↳ [relative-structural] xpath: //*[@id='ddlFormSubmittedSchool_listbox']//li
    receiveSubmittedDateIntoWhic: page.locator('xpath=//*[@id=\'divFormControls\']//div').filter({ visible: true }).first(),
    //  ↳ [relative-structural] xpath: //*[@id='divFormControls']//div
    birthDate           : page.locator('xpath=//*[@id=\'ddlSubmittedDate_listbox\']//li').filter({ visible: true }).first(),
    //  ↳ [relative-structural] xpath: //*[@id='ddlSubmittedDate_listbox']//li
    street              : page.locator('xpath=//*[@id=\'ddlSubmittedTime_listbox\']//li').filter({ visible: true }).first(),
    //  ↳ [relative-structural] xpath: //*[@id='ddlSubmittedTime_listbox']//li
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
  await smartFill(L.formnameInput, 'testing');
  await smartClick(L.submitFormFromParent);
  await smartClick(L.formSubmittedSchool);
  await smartClick(L.receiveSubmittedDateIntoWhic);
  await smartClick(L.birthDate);
  await smartClick(L.street);
  await smartClick(L.saveButton);
  await page.waitForURL('**https://ap-forms.rediker.com/FormsManager/CreateEditPages?formId=1357&formTypeId=1');
});