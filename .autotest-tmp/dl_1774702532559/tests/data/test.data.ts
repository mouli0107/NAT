export const TEST_DATA = {
  valid: {
    email:    'test@example.com',
    password: 'TestPass@123',
    name:     'John Doe',
    phone:    '9876543210',
    company:  'Test Company',
    subject:  'Test Subject',
    message:  'This is a test message sent by the automated test suite.',
    url:      'https://example.com',
    number:   '42',
    date:     '2025-01-15',
  },
  invalid: {
    email:    'not-an-email',
    password: '',
    name:     '',
    phone:    'abc-def',
  },
  edge: {
    xss:          '<script>alert("xss")</script>',
    sql:          "' OR 1=1; --",
    longString:   'A'.repeat(256),
    specialChars: '!@#$%^&*()_+-=[]{}|;':",./<>?',
    unicode:      '你好 Héllo Wörld',
    emptyString:  '',
    whitespace:   '   ',
  },
} as const;

export const TIMEOUTS = {
  short:      5_000,
  medium:    15_000,
  long:      30_000,
  navigation: 10_000,
} as const;
