import { Page } from '@playwright/test';
import { OXFORDACADEMYBANGALOREPage } from '../pages/OXFORDACADEMYBANGALOREPage';
import { LandingPage } from '../pages/LandingPage';
import { LoadFormPage } from '../pages/LoadFormPage';
import { InvoicePage } from '../pages/InvoicePage';
import { InvoicePaymentPage } from '../pages/InvoicePaymentPage';
import { Elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPage } from '../pages/Elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPage';
import { Elements-inner-autocomplete-suggestions-7e6cc2e61de750f103bf43ea420923ad.htmlPage } from '../pages/Elements-inner-autocomplete-suggestions-7e6cc2e61de750f103bf43ea420923ad.htmlPage';
import { prepareSite } from '../helpers/universal';
import { selectKendoDropdown, selectKendoDate, waitAndDismissAnyKendoAlert, fillKendoGridDates } from '../helpers/kendo';

export async function executemakingpayemntWorkflow(
  page: Page,
  data: Record<string, any>
) {
  await page.goto(data.startUrl || 'https://apolf-web-preprod.azurewebsites.net/OXFORDACADEMYBANGALORE');
  await prepareSite(page);

  const oXFORDACADEMYBANGALOREPage = new OXFORDACADEMYBANGALOREPage(page);
  await oXFORDACADEMYBANGALOREPage.clickTxtusername();
  await oXFORDACADEMYBANGALOREPage.clickTxtuserpassword();
  await oXFORDACADEMYBANGALOREPage.clickLogin();
  await oXFORDACADEMYBANGALOREPage.clickHallRebeParent();
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Applicant/Landing', { waitUntil: 'domcontentloaded' });
  const landingPage = new LandingPage(page);
  await landingPage.clickAishuLince();
  await landingPage.clickDavidHall();
  await landingPage.clickAishuLince();
  await landingPage.clickViewEdit();
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/ApplicantForm/LoadForm', { waitUntil: 'domcontentloaded' });
  const loadFormPage = new LoadFormPage(page);
  await loadFormPage.clickMyPayments();
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Invoice/Invoice', { waitUntil: 'domcontentloaded' });
  const invoicePage = new InvoicePage(page);
  await invoicePage.clickChkinvoice491();
  await invoicePage.enableChkinvoice491();
  await invoicePage.clickPayNow();
  await page.waitForURL('**https://apolf-web-preprod.azurewebsites.net/Payment/InvoicePayment', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://js.stripe.com/v3/m-outer-3437aaddcdf6922d623e172c2d6f9278.html#url=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FPayment%2FInvoicePayment&title=AdminPlus%20Online%20Forms&referrer=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FInvoice%2FInvoice&muid=NA&sid=NA&version=6&preview=false&__shared_params__[version]=v3', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://m.stripe.network/inner.html#url=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FPayment%2FInvoicePayment&title=AdminPlus%20Online%20Forms&referrer=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FInvoice%2FInvoice&muid=NA&sid=NA&version=6&preview=false&__shared_params__[version]=v3', { waitUntil: 'domcontentloaded' });
  const invoicePaymentPage = new InvoicePaymentPage(page);
  await invoicePaymentPage.enableOptionsradios();
  await page.waitForURL('**https://js.stripe.com/v3/controller-with-preconnect-d71a19cc125eb595dcbbd41283243459.html#__shared_params__[version]=v3&__shared_params__[light_experiment_assignments]=%7B%22token%22%3A%229823beaf-4239-4bc3-b400-2d7b61d6dd49%22%2C%22assignments%22%3A%7B%22link_ewcs_prewarm_experiment_v2%22%3A%22control%22%2C%22react_version_17_v2%22%3A%22treatment%22%7D%7D&apiKey=pk_test_51NT6GOEMT3Abn8RAhnFhwzkrN7k5JFxzdCXUz6X1qwDr2zfslAlZgesz1uDx1oafTrvaTjUPd7Wmzadh1i0hkIVr00sowt1mNR&stripeAccount=acct_1TGwyACqEdyxRjzU&stripeJsId=9823beaf-4239-4bc3-b400-2d7b61d6dd49&stripeObjId=sobj-112d1eff-06eb-4f91-878c-d5dd1bdc226d&firstStripeInstanceCreatedLatency=24247&controllerCount=1&isCheckout=false&stripeJsLoadTime=1775798717043&manualBrowserDeprecationRollout=false&mids[guid]=86a69335-dfd4-4e2e-822c-b8132150f971f1913d&mids[muid]=6b500df1-6ea8-4f41-9885-caf036c5b1b862dc14&mids[sid]=a22368f5-e2e2-490b-8389-1d7db4f282dc91c204&react_version_variant=treatment&referrer=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FPayment%2FInvoicePayment&controllerId=__privateStripeController0671', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://js.stripe.com/v3/elements-inner-loader-ui-2c738cdf55f67118f3a7046530bae1ae.html#__shared_params__[version]=v3&__shared_params__[light_experiment_assignments]=%7B%22token%22%3A%229823beaf-4239-4bc3-b400-2d7b61d6dd49%22%2C%22assignments%22%3A%7B%22link_ewcs_prewarm_experiment_v2%22%3A%22control%22%2C%22react_version_17_v2%22%3A%22treatment%22%7D%7D&referrer=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FPayment%2FInvoicePayment&controllerId=__privateStripeController0671', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://js.stripe.com/v3/payment-request-inner-google-pay-4dd445e7c27cd6243af4d775261b67dc.html#__shared_params__[version]=v3&__shared_params__[light_experiment_assignments]=%7B%22token%22%3A%229823beaf-4239-4bc3-b400-2d7b61d6dd49%22%2C%22assignments%22%3A%7B%22link_ewcs_prewarm_experiment_v2%22%3A%22control%22%2C%22react_version_17_v2%22%3A%22treatment%22%7D%7D&authentication[apiKey]=pk_test_51NT6GOEMT3Abn8RAhnFhwzkrN7k5JFxzdCXUz6X1qwDr2zfslAlZgesz1uDx1oafTrvaTjUPd7Wmzadh1i0hkIVr00sowt1mNR&authentication[accountId]=acct_1TGwyACqEdyxRjzU&mids[guid]=86a69335-dfd4-4e2e-822c-b8132150f971f1913d&mids[muid]=6b500df1-6ea8-4f41-9885-caf036c5b1b862dc14&mids[sid]=a22368f5-e2e2-490b-8389-1d7db4f282dc91c204&origin=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net&referrer=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FPayment%2FInvoicePayment&controllerId=__privateStripeController0671', { waitUntil: 'domcontentloaded' });
  await invoicePaymentPage.clickNewPaymentMethod();
  await page.waitForURL('**https://js.stripe.com/v3/elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.html#__shared_params__[version]=v3&__shared_params__[light_experiment_assignments]=%7B%22token%22%3A%229823beaf-4239-4bc3-b400-2d7b61d6dd49%22%2C%22assignments%22%3A%7B%22link_ewcs_prewarm_experiment_v2%22%3A%22control%22%2C%22react_version_17_v2%22%3A%22treatment%22%7D%7D&wait=false&rtl=false&publicOptions[fields][billingDetails][name]=never&publicOptions[fields][billingDetails][address][postalCode]=never&stripeAccount=acct_1TGwyACqEdyxRjzU&elementsInitSource=stripe.elements&elementId=payment-cc315d20-7654-4062-988e-b2cab75c1f54&componentName=payment&keyMode=test&apiKey=pk_test_51NT6GOEMT3Abn8RAhnFhwzkrN7k5JFxzdCXUz6X1qwDr2zfslAlZgesz1uDx1oafTrvaTjUPd7Wmzadh1i0hkIVr00sowt1mNR&frameMessagingStrategy=direct&cryptoWalletDetected=false&accessoryCssUrl=https%3A%2F%2Fjs.stripe.com%2Fv3%2Ffingerprinted%2Fcss%2Felements-inner-payment-02f28f8946ff6bcfb2f860c4ad01591f.css&referrer=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FPayment%2FInvoicePayment&controllerId=__privateStripeController0671', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://js.stripe.com/v3/elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.html#__shared_params__[version]=v3&__shared_params__[light_experiment_assignments]=%7B%22token%22%3A%229823beaf-4239-4bc3-b400-2d7b61d6dd49%22%2C%22assignments%22%3A%7B%22link_ewcs_prewarm_experiment_v2%22%3A%22control%22%2C%22react_version_17_v2%22%3A%22treatment%22%7D%7D&wait=false&rtl=false&publicOptions[mode]=billing&stripeAccount=acct_1TGwyACqEdyxRjzU&elementsInitSource=stripe.elements&elementId=address-db8908bf-eee0-42a7-a22f-0264c2711726&componentName=address&keyMode=test&apiKey=pk_test_51NT6GOEMT3Abn8RAhnFhwzkrN7k5JFxzdCXUz6X1qwDr2zfslAlZgesz1uDx1oafTrvaTjUPd7Wmzadh1i0hkIVr00sowt1mNR&frameMessagingStrategy=direct&accessoryCssUrl=https%3A%2F%2Fjs.stripe.com%2Fv3%2Ffingerprinted%2Fcss%2Felements-inner-address-1e1677a1b322de4064f1656b3f7dc117.css&referrer=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FPayment%2FInvoicePayment&controllerId=__privateStripeController0671', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://js.stripe.com/v3/m-outer-3437aaddcdf6922d623e172c2d6f9278.html#url=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FPayment%2FInvoicePayment&title=AdminPlus%20Online%20Forms&referrer=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FInvoice%2FInvoice&muid=6b500df1-6ea8-4f41-9885-caf036c5b1b862dc14&sid=a22368f5-e2e2-490b-8389-1d7db4f282dc91c204&version=6&preview=false&__shared_params__[version]=v3', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://js.stripe.com/v3/hcaptcha-invisible-4311b0720013ded0e4de19b533500f96.html#debugMode=false&parentOrigin=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://m.stripe.network/inner.html#url=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FPayment%2FInvoicePayment&title=AdminPlus%20Online%20Forms&referrer=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FInvoice%2FInvoice&muid=6b500df1-6ea8-4f41-9885-caf036c5b1b862dc14&sid=a22368f5-e2e2-490b-8389-1d7db4f282dc91c204&version=6&preview=false&__shared_params__[version]=v3', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://js.stripe.com/v3/elements-inner-ach-bank-search-results-5a509afed1480c78079ef1ecc05d65fa.html#__shared_params__[version]=v3&__shared_params__[light_experiment_assignments]=%7B%22token%22%3A%229823beaf-4239-4bc3-b400-2d7b61d6dd49%22%2C%22assignments%22%3A%7B%22link_ewcs_prewarm_experiment_v2%22%3A%22control%22%2C%22react_version_17_v2%22%3A%22treatment%22%7D%7D&wait=false&rtl=false&publicOptions[fields][billingDetails][name]=never&publicOptions[fields][billingDetails][address][postalCode]=never&controllingElement=paymentElement&stripeAccount=acct_1TGwyACqEdyxRjzU&elementsInitSource=stripe.elements&elementId=payment-cc315d20-7654-4062-988e-b2cab75c1f54&componentName=achBankSearchResults&keyMode=test&apiKey=pk_test_51NT6GOEMT3Abn8RAhnFhwzkrN7k5JFxzdCXUz6X1qwDr2zfslAlZgesz1uDx1oafTrvaTjUPd7Wmzadh1i0hkIVr00sowt1mNR&frameMessagingStrategy=postMessage&referrer=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FPayment%2FInvoicePayment&controllerId=__privateStripeController0671', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://js.stripe.com/v3/google-maps-inner-b37d228a09c4cd63c3d82a90ada2acb4.html#__shared_params__[version]=v3&__shared_params__[light_experiment_assignments]=%7B%22token%22%3A%229823beaf-4239-4bc3-b400-2d7b61d6dd49%22%2C%22assignments%22%3A%7B%22link_ewcs_prewarm_experiment_v2%22%3A%22control%22%2C%22react_version_17_v2%22%3A%22treatment%22%7D%7D&apiKey=AIzaSyCab6eIMNih34mQb3XI_QWXagmF2_rvQAg&elementMode=billing&referrer=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FPayment%2FInvoicePayment&controllerId=__privateStripeController0671', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://js.stripe.com/v3/elements-inner-autocomplete-suggestions-7e6cc2e61de750f103bf43ea420923ad.html#__shared_params__[version]=v3&__shared_params__[light_experiment_assignments]=%7B%22token%22%3A%229823beaf-4239-4bc3-b400-2d7b61d6dd49%22%2C%22assignments%22%3A%7B%22link_ewcs_prewarm_experiment_v2%22%3A%22control%22%2C%22react_version_17_v2%22%3A%22treatment%22%7D%7D&wait=false&rtl=false&publicOptions[mode]=billing&controllingElement=addressElement&controllingMode=billing&stripeAccount=acct_1TGwyACqEdyxRjzU&elementsInitSource=stripe.elements&elementId=address-db8908bf-eee0-42a7-a22f-0264c2711726&componentName=autocompleteSuggestions&keyMode=test&apiKey=pk_test_51NT6GOEMT3Abn8RAhnFhwzkrN7k5JFxzdCXUz6X1qwDr2zfslAlZgesz1uDx1oafTrvaTjUPd7Wmzadh1i0hkIVr00sowt1mNR&frameMessagingStrategy=postMessage&referrer=https%3A%2F%2Fapolf-web-preprod.azurewebsites.net%2FPayment%2FInvoicePayment&controllerId=__privateStripeController0671', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://pay.google.com/gp/p/ui/payframe?origin=https%3A%2F%2Fjs.stripe.com&mid=', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://b.stripecdn.com/stripethirdparty-srv/assets/v32.5/HCaptchaInvisible.html**', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://b.stripecdn.com/stripethirdparty-srv/assets/v32.5/GoogleMaps.html**', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://newassets.hcaptcha.com/captcha/v1/9abe19f0c4a8a3dfa7147f989a6f693ecec2228b/static/hcaptcha.html#frame=challenge&id=0mmio4crdv6&host=b.stripecdn.com&sentry=true&reportapi=https%3A%2F%2Faccounts.hcaptcha.com&recaptchacompat=true&custom=false&hl=en&tplinks=on&andint=off&pstissuer=https%3A%2F%2Fpst-issuer.hcaptcha.com&sitekey=20000000-ffff-ffff-ffff-000000000002&size=invisible&theme=light&origin=https%3A%2F%2Fb.stripecdn.com', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**https://newassets.hcaptcha.com/captcha/v1/9abe19f0c4a8a3dfa7147f989a6f693ecec2228b/static/hcaptcha.html#frame=checkbox-invisible', { waitUntil: 'domcontentloaded' });
  const elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPage = new Elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPage(page);
  await elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPage.click1234123412341234();
  await elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPage.fillExpirationDateMmYy('');
  await elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPage.fillSecurityCode('');
  await elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPage.fillSecurityCode('123');
  await elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPage.clickBillingaddressNameinput();
  await elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPage.fillCountryOrRegion('IN');
  await elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPage.fillAddressLine1('Nous infosystems');
  await invoicePaymentPage.clickSave();
  await invoicePaymentPage.clickOk();
  await elements-inner-accessory-target-83bb15c7ad26860d4b861a37e1079afc.htmlPage.clickBillingaddressLocalityinput();
  const elements-inner-autocomplete-suggestions-7e6cc2e61de750f103bf43ea420923ad.htmlPage = new Elements-inner-autocomplete-suggestions-7e6cc2e61de750f103bf43ea420923ad.htmlPage(page);
  await elements-inner-autocomplete-suggestions-7e6cc2e61de750f103bf43ea420923ad.htmlPage.clickNousInfosystems24thMainRoadN();
  await invoicePaymentPage.clickSave();
}
