import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Test data — extracted from recorded interactions.
 * Sensitive values (passwords, tokens) are read from environment variables.
 * Override any value by setting the corresponding env var.
 */
export const testData = {
  /** Base URL of the application under test */
  baseUrl: process.env.BASE_URL || 'https://apolf-web-preprod.azurewebsites.net/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE',

  /** Enter your email[id=txtUserName] */
  enterYourEmailidtxtUserName: process.env.ENTER_YOUR_EMAILIDTXT_USER_NAME || "mahimagp@nousinfo.com",

  /** Enter your password[id=txtUserPassword] — set ENTER_YOUR_PASSWORDIDTXT_USER_PASSWORD env var */
  enterYourPasswordidtxtUserPassword: process.env.ENTER_YOUR_PASSWORDIDTXT_USER_PASSWORD || '',

  /** FormName[id=FormName] */
  formNameidFormName: process.env.FORM_NAMEID_FORM_NAME || "Moulitestme",

  /** formStartDate[id=formStartDate] */
  formStartDateidformStartDate: process.env.FORM_START_DATEIDFORM_START_DATE || "04-09-2026 12:00 AM",

  /** formEndDate[id=formEndDate] */
  formEndDateidformEndDate: process.env.FORM_END_DATEIDFORM_END_DATE || "04-16-2026 12:00 AM",

  /** Amount[id=Amount] */
  amountidAmount: process.env.AMOUNTID_AMOUNT || "40000",

  /** transactionFee[id=transactionFee] */
  transactionFeeidtransactionFee: process.env.TRANSACTION_FEEIDTRANSACTION_FEE || "4",

  /** perTansactionFee[id=perTansactionFee] */
  perTansactionFeeidperTansactionFee: process.env.PER_TANSACTION_FEEIDPER_TANSACTION_FEE || "3",

  /** btnCreatePaymentPlan[id=btnCreatePaymentPlan] */
  btnCreatePaymentPlanidbtnCreatePaymentPlan: process.env.BTN_CREATE_PAYMENT_PLANIDBTN_CREATE_PAYMENT_PLAN || "+ Create",

  /** txtPaymentPlanName[id=txtPaymentPlanName] */
  txtPaymentPlanNameidtxtPaymentPlanName: process.env.TXT_PAYMENT_PLAN_NAMEIDTXT_PAYMENT_PLAN_NAME || "test",

  /** txtNoOfPayments[id=txtNoOfPayments] */
  txtNoOfPaymentsidtxtNoOfPayments: process.env.TXT_NO_OF_PAYMENTSIDTXT_NO_OF_PAYMENTS || "2",

  /** txtNoOfDaysforPaymentDue[id=txtNoOfDaysforPaymentDue] */
  txtNoOfDaysforPaymentDueidtxtNoOfDaysforPaymentDue: process.env.TXT_NO_OF_DAYSFOR_PAYMENT_DUEIDTXT_NO_OF_DAYSFOR_PAYMENT_DUE || "3",

  /** PaymentDate[id=PaymentDate] */
  paymentDateidPaymentDate: process.env.PAYMENT_DATEID_PAYMENT_DATE || "04-08-2026",

} as const;

export type TestData = typeof testData;