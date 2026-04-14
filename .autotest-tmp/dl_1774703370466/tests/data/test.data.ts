export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export interface CareerFormData {
  name: string;
  email: string;
  phone: string;
  yearsOfExperience: string;
  aboutYou: string;
}

export const validContactData: ContactFormData = {
  name: 'Sarah Mitchell',
  email: 'sarah.mitchell@testcorp.com',
  phone: '+14155550192',
  subject: 'Partnership Inquiry - Q2 2025',
  message: 'We are evaluating quality engineering vendors for an ' +
           'upcoming platform migration. Please contact us to ' +
           'schedule a discovery call.',
};

export const validCareerData: CareerFormData = {
  name: 'James Thornton',
  email: 'james.thornton@mailtest.com',
  phone: '+12025550147',
  yearsOfExperience: '7',
  aboutYou: 'Full-stack engineer with 7 years in enterprise software, ' +
            'specializing in test automation and CI/CD pipelines.',
};

export const invalidEmails: string[] = [
  'plaintext',
  'missing@',
  '@nodomain.com',
  'double@@domain.com',
  'no-tld@domain',
  'spaces in@email.com',
];

export const invalidPhones: string[] = [
  'abcdefg',
  '!!!###',
  '123',
  '--',
  '0'.repeat(20),
];

export const edgeData = {
  longString: 'A'.repeat(500),
  unicode: 'Ñoño résumé café naïve Ångström',
  emoji: 'Test input 🎉🔥💯',
  htmlEntities: "O'Brien & <Associates> \"Quoted\"",
} as const;

export const xssPayloads: string[] = [
  '<script>alert("xss")</script>',
  '"><img src=x onerror=alert(1)>',
  "';alert('xss');//",
  '<svg onload=alert(1)>',
  '{{7*7}}',
];

export const sqlPayloads: string[] = [
  "' OR '1'='1",
  "admin'--",
  "1; DROP TABLE users;--",
  "' UNION SELECT null,null--",
  "1' AND SLEEP(5)--",
];
