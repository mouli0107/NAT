import * as dotenv from 'dotenv';
dotenv.config();

// ── Common constants ────────────────────────────────────────────────────
const START_URL = 'https://apolf-web-preprod.azurewebsites.net/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE';
const ADMIN_CREDENTIALS = { username: 'mahimagp@nousinfo.com', password: 'Mahima123' };

// ── Legacy test data (used by monolithic scripts) ───────────────────────
export const TestData: Record<string, any> = {
  startUrl: START_URL,
  recipientEmail: 'testmouli4@gmail.com',
  emailSubject: 'Fill',
  emailLinkDomain: 'apolf-web-preprod.azurewebsites.net',
  emailWaitSeconds: 120,
  parentUsername: 'mahimagp@nousinfo.com',
  parentPassword: 'Mahima123',
  cardNumber: '4242424242424242',
  cardExpiry: '12/28',
  cardCVV: '123',
  billingCountry: 'IN',
  billingAddress: 'Nous Infosystems, 24th Main Road',
  billingCity: 'Bengaluru',

  // TC001 — Create form with fee, date range, and 12-installment payment plan
  // 12 installments = 12 invoices — enough for all negative + positive payment tests
  TC001: {
    startUrl: START_URL,
    credentials: ADMIN_CREDENTIALS,
    formName: `PayTest_${Date.now()}`,
    enableDateRange: true,
    fromDate: '04-01-2026 12:00 AM',
    toDate: '12-31-2026 11:59 PM',
    // emailTemplateParent and emailTemplateSchool left undefined — use defaults
    feeEnabled: true,
    baseAmount: '100',
    transactionFee: '2.5',
    perTransactionFee: '1.0',
    paymentPlanEnabled: true,
    paymentPlanName: 'Monthly Plan',
    numberOfPayments: '12',
    daysForPayment: '30',
  },

  // TC002 — Create form with fee only
  TC002: {
    startUrl: START_URL,
    credentials: ADMIN_CREDENTIALS,
    formName: `FeeOnly_${Date.now()}`,
    emailTemplateParent: 'Form Submitted',
    emailTemplateSchool: 'Form Submitted',
    feeEnabled: true,
    baseAmount: '50',
    transactionFee: '2.5',
    perTransactionFee: '1.0',
  },

  // TC003 — Create basic form (no fee)
  TC003: {
    startUrl: START_URL,
    credentials: ADMIN_CREDENTIALS,
    formName: `Basic_${Date.now()}`,
    emailTemplateParent: 'Form Submitted',
    emailTemplateSchool: 'Form Submitted',
  },
};

// ══════════════════════════════════════════════════════════════════════════
// 5-LAYER FRAMEWORK: Finix Gateway Payment Test Data
// Each TC has its own COMPLETE self-contained data object.
// Specs import only by TC ID — no spreading or merging in test files.
// ══════════════════════════════════════════════════════════════════════════
import { PaymentViaEmailLinkData } from '../actions/business/PaymentViaEmailLink.actions';

// ── Shared base (private — not exported, only used to build TC data) ────
const _base = {
  startUrl: START_URL,
  adminUsername: ADMIN_CREDENTIALS.username,
  adminPassword: ADMIN_CREDENTIALS.password,
  recipientEmail: 'testmouli4@gmail.com',
  parentUsername: ADMIN_CREDENTIALS.username,
  parentPassword: ADMIN_CREDENTIALS.password,
  emailSubject: 'Fill',
  emailWaitSeconds: 120,
  emailLinkDomain: 'apolf-web-preprod.azurewebsites.net',
};

const _baseCard = {
  cardExpiry: '1228',
  cardCVV: '123',
  billingAddress: 'Nous Infosystems, 24th Main Road',
  billingCity: 'Bengaluru',
  billingState: 'KA',
  billingZip: '560078',
};

// ══════════════════════════════════════════════════════════════════════════
// POSITIVE: Card Payment Test Cases
// ══════════════════════════════════════════════════════════════════════════

/** TC_PAY_001 / TC_FNX_02 — Valid payment with existing card (4242424242424242) */
export const TC_FNX_02_Data: PaymentViaEmailLinkData = {
  ..._base,
  card: { ..._baseCard, cardholderName: 'David Hall', cardNumber: '4242424242424242' },
};

/** TC_FNX_03 — Payment with NEW card (4000000760000002) */
export const TC_FNX_03_Data: PaymentViaEmailLinkData = {
  ..._base,
  card: { ..._baseCard, cardholderName: 'New Card Test', cardNumber: '4000000760000002' },
};

/** TC_FNX_13 — Payment without saving card details */
export const TC_FNX_13_Data: PaymentViaEmailLinkData = {
  ..._base,
  saveFuturePayments: false,
  card: { ..._baseCard, cardholderName: 'No Save Test', cardNumber: '4242424242424242' },
};

// ══════════════════════════════════════════════════════════════════════════
// NEGATIVE: Card Payment Test Cases (Finix-specific test cards)
// ══════════════════════════════════════════════════════════════════════════

/** TC_FNX_05 — Declined card */
export const TC_FNX_05_Data: PaymentViaEmailLinkData = {
  ..._base,
  card: { ..._baseCard, cardholderName: 'Declined Test', cardNumber: '4000000000009979' },
};

/** TC_FNX_06 — Insufficient funds */
export const TC_FNX_06_Data: PaymentViaEmailLinkData = {
  ..._base,
  card: { ..._baseCard, cardholderName: 'Insufficient Funds', cardNumber: '4000000000000069' },
};

/** TC_FNX_07 — Expired card */
export const TC_FNX_07_Data: PaymentViaEmailLinkData = {
  ..._base,
  card: { ..._baseCard, cardholderName: 'Expired Card', cardNumber: '4000000000009987' },
};

/** TC_FNX_08 — Incorrect CVC */
export const TC_FNX_08_Data: PaymentViaEmailLinkData = {
  ..._base,
  card: { ..._baseCard, cardholderName: 'Incorrect CVC', cardNumber: '4000056655665556' },
};

/** TC_FNX_09 — Incorrect card number */
export const TC_FNX_09_Data: PaymentViaEmailLinkData = {
  ..._base,
  card: { ..._baseCard, cardholderName: 'Incorrect Number', cardNumber: '4544206329536898' },
};

/** TC_FNX_10 — Exceeding approval limit / card velocity exceeded */
export const TC_FNX_10_Data: PaymentViaEmailLinkData = {
  ..._base,
  card: { ..._baseCard, cardholderName: 'Velocity Exceeded', cardNumber: '4000000000009995' },
};

// ══════════════════════════════════════════════════════════════════════════
// POSITIVE: ACH / Bank Account Payment Test Cases
// ══════════════════════════════════════════════════════════════════════════

/** TC_FNX_11 — Valid ACH bank account payment */
export const TC_FNX_11_Data: PaymentViaEmailLinkData = {
  ..._base,
  paymentMethod: 'ach',
  card: { ..._baseCard, cardholderName: 'John Smith', cardNumber: '' },
  ach: {
    accountName: 'John Smith',
    accountType: 'Personal Checking',
    accountNumber: '1099999999',
    routingNumber: '122105278',
  },
};

/** TC_FNX_12 — Invalid ACH bank account */
export const TC_FNX_12_Data: PaymentViaEmailLinkData = {
  ..._base,
  paymentMethod: 'ach',
  card: { ..._baseCard, cardholderName: 'Invalid Account', cardNumber: '' },
  ach: {
    accountName: 'Invalid Account Test',
    accountType: 'Personal Checking',
    accountNumber: '0000000005',
    routingNumber: '122105278',
  },
};

// ══════════════════════════════════════════════════════════════════════════
// Legacy aliases (backward compatibility for old specs)
// ══════════════════════════════════════════════════════════════════════════
export const PaymentViaEmailLinkTestData = TC_FNX_02_Data;
