import * as dotenv from 'dotenv';
dotenv.config();

export const TestData = {
  startUrl: 'http://172.25.1.238:83/dashboard',
  username: 'parthasarathyh',
  password: process.env.TEST_PASSWORD || 'Shurgard@789',
  firstName: 'Harsh',
  inquiryWhy: '2: Extra Space',
  editwhat: ' i require extra space',
  inquiryObjection: '1: Price',
  inquiryOcobjection: '1: Other store',
  selectcustomertype: '0',
};
