import * as dotenv from 'dotenv';
dotenv.config();

export const TestData = {
  TC001: {
    startUrl: 'https://apolf-web-preprod.azurewebsites.net/Admin/AdminLogin?schoolLink=OXFORDACADEMYBANGALORE',
    credentials: {
      username: process.env.TEST_USERNAME || 'mahimagp@nousinfo.com',
      password: process.env.TEST_PASSWORD || 'Mahima123',
    },
    formName: 'Test_' + Date.now(),
    endDate: '04-10-2026 12:00 AM',
    emailTemplateParent: 'Submit Form From Parent',
    emailTemplateSchool: 'Form Submitted School',
    submittedDateField: 'Birth Date',
    submittedTimeField: 'Parent/Guardian',
    paymentDateField: 'Birth Date',
    transactionIdField: 'State',
    amountPaidField: 'State',
    depositAmount: '44',
    baseAmount: '3434',
  },
};
