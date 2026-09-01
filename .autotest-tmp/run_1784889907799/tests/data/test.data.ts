/**
 * Test data for Playwright automation suite.
 * All data is synthetic — safe to commit to source control.
 *
 * Usage:
 *   import { validContactData, edgeData, xssPayloads }
 *     from '../../data/test.data';
 */

// ── Interfaces ────────────────────────────────────────────────────────────────

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
  resumeText: string;
}

export interface SearchData {
  validTerm: string;
  emptyTerm: string;
}

// ── Valid form data ───────────────────────────────────────────────────────────

export const validContactData: ContactFormData = {
  name: 'Alex Turner',
  email: 'alex.turner@testmail.example.com',
  phone: '+14155550100',
  subject: 'Automation Test Inquiry',
  message:
    'This is an automated test message. ' +
    'Please disregard this submission.',
};

export const validCareerData: CareerFormData = {
  name: 'Jordan Lee',
  email: 'jordan.lee@testmail.example.com',
  phone: '+12025550142',
  yearsOfExperience: '5',
  resumeText:
    'Experienced software engineer with 5 years in test automation ' +
    'and CI/CD pipeline development.',
};

export const searchData: SearchData = {
  validTerm: 'services',
  emptyTerm: '',
};

// ── Invalid inputs for negative testing ──────────────────────────────────────

export const invalidEmails: readonly string[] = [
  'plaintext',
  'missing-at-sign',
  '@nodomain.com',
  'double@@domain.com',
  'no-tld@domain',
  'trailing-dot@domain.com.',
] as const;

export const invalidPhones: readonly string[] = [
  'abc',
  '!!!###',
  '123',
  '--',
  '0'.repeat(25),
] as const;

// ── Edge-case inputs ──────────────────────────────────────────────────────────

export const edgeData = {
  longString:   'A'.repeat(500),
  unicode:      'Ñoño résumé café naïve Ångström Ψυχή',
  emoji:        'Test 🎉🔥💯✅🚀',
  htmlEntities: "O'Brien & <Associates> \"Quoted\" tag</p>",
  specialChars: `!@#$%^&*()_+-=[]{}|;':",./<>?`,
  whitespace:   '   ',
  newlines:     'Line1\nLine2\nLine3',
} as const;

// ── Security payloads ─────────────────────────────────────────────────────────

export const xssPayloads: readonly string[] = [
  '<script>alert("xss")</script>',
  '"><img src=x onerror=alert(1)>',
  "';alert('xss');//",
  '<svg onload=alert(1)>',
  '{{7*7}}',
  'javascript:alert(1)',
] as const;

export const sqlPayloads: readonly string[] = [
  "' OR '1'='1",
  "admin'--",
  "1; DROP TABLE users;--",
  "' UNION SELECT null,null--",
  "1' AND SLEEP(5)--",
] as const;

// ── Timeout constants ─────────────────────────────────────────────────────────

export const TIMEOUTS = {
  short:      5_000,
  medium:    15_000,
  long:      30_000,
  navigation: 20_000,
} as const;
