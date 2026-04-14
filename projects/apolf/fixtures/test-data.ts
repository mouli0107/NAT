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
  enterYourEmailidtxtUserName: process.env.ENTER_YOUR_EMAILIDTXT_USER_NAME || "testmouli4@gmail.com",

  /** Enter your password[id=txtUserPassword] — set ENTER_YOUR_PASSWORDIDTXT_USER_PASSWORD env var */
  enterYourPasswordidtxtUserPassword: process.env.ENTER_YOUR_PASSWORDIDTXT_USER_PASSWORD || '',

  /** FormName[id=FormName] */
  formNameidFormName: process.env.FORM_NAMEID_FORM_NAME || "moulifromfrom",

  /** Amount[id=Amount] */
  amountidAmount: process.env.AMOUNTID_AMOUNT || "10000",

  /** perTansactionFee[id=perTansactionFee] */
  perTansactionFeeidperTansactionFee: process.env.PER_TANSACTION_FEEIDPER_TANSACTION_FEE || "5",

  /** transactionFee[id=transactionFee] */
  transactionFeeidtransactionFee: process.env.TRANSACTION_FEEIDTRANSACTION_FEE || "2",

  /** DepositAmount[id=DepositAmount] */
  depositAmountidDepositAmount: process.env.DEPOSIT_AMOUNTID_DEPOSIT_AMOUNT || "1000",

  /** btnCreatePaymentPlan[id=btnCreatePaymentPlan] */
  btnCreatePaymentPlanidbtnCreatePaymentPlan: process.env.BTN_CREATE_PAYMENT_PLANIDBTN_CREATE_PAYMENT_PLAN || "+ Create",

} as const;

export type TestData = typeof testData;