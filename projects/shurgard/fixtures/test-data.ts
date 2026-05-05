import * as dotenv from 'dotenv';
dotenv.config();

export const TestData = {
  startUrl:  process.env.SHURGARD_URL      || 'http://172.25.1.238:83/login',
  username:  process.env.SHURGARD_USER     || 'parthasarathyh',
  password:  process.env.SHURGARD_PASSWORD || 'Shurgard@789',

  // Location selection
  country:  'Belgium',
  location: '(P2PHUT) Bruxelles - Forest',

  // TC003 — Add New Customer
  TC003: {
    title:       'Mr',           // Required — options: N/A | Miss | Mister | Mr | Mrs | Mrs.
    firstName:   'Harsh',
    lastName:    'Joshi',
    dateOfBirth: '',
    phoneNumber: '7896786789',
    email:       'test-customer@example.com',
  },

  // TC004 — Search Customer
  TC004: {
    firstName:    'Harsh',
    customerType: '0',           // '0' = All Customer Groups
    customerName: 'Harsh Joshi', // Display name to click in results
  },

  // TC005 — Customer Inquiry
  TC005: {
    inquiryName:             'Inquiry 1',
    needDate:                '27-04-2026',     // dd-mm-yyyy format
    inquiryWhy:              '2: Extra Space', // select option value
    inquiryWhyDetail:        '',               // optional detail text
    editWhat:                'i require extra space',
    inquiryObjection:        '1: Price',       // select option value
    inquiryObjectionDetail:  '',               // optional detail text
    inquiryOCObjection:      '1: Other store', // select option value
    inquiryOCObjectionDetail: '',              // optional detail text
  },
};
