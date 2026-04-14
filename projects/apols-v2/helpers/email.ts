/**
 * Gmail Email Helper for NAT 2.0
 * ─────────────────────────────────────────────────────────
 * Connects to Gmail via IMAP, waits for emails, extracts links.
 * Used for testing email-triggered workflows (e.g., APOLF form publish → parent receives link).
 *
 * Requires in .env:
 *   TEST_GMAIL_ADDRESS=testmouli4@gmail.com
 *   TEST_GMAIL_APP_PASSWORD=iqaismqxyoatzjwb
 *
 * Usage:
 *   import { extractLinksFromEmail } from '../helpers/email';
 *   const result = await extractLinksFromEmail({
 *     subject: 'Fill Form',
 *     linkDomain: 'apolf-web-preprod.azurewebsites.net',
 *     waitSeconds: 60,
 *   });
 *   await page.goto(result.primaryLink);
 */

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EmailSearchOptions {
  /** Partial subject match (case-insensitive) */
  subject?: string;
  /** Only emails received after this Date */
  receivedAfter?: Date;
  /** Max seconds to wait for the email to arrive (default: 60) */
  waitSeconds?: number;
  /** How often to poll the inbox in seconds (default: 5) */
  pollIntervalSeconds?: number;
  /** Sender email address filter */
  from?: string;
}

export interface EmailResult {
  subject: string;
  from: string;
  to: string;
  date: Date | null;
  bodyText: string;
  bodyHtml: string;
  messageId: string;
}

export interface EmailLinkResult {
  allLinks: string[];
  appLinks: string[];
  primaryLink: string;
  subject: string;
  from: string;
  bodyText: string;
  bodyHtml: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gmail IMAP Connection
// ─────────────────────────────────────────────────────────────────────────────

function createImapClient(): ImapFlow {
  const address = process.env.TEST_GMAIL_ADDRESS;
  const password = process.env.TEST_GMAIL_APP_PASSWORD;

  if (!address || !password) {
    throw new Error(
      'Gmail credentials not configured.\n' +
      'Set TEST_GMAIL_ADDRESS and TEST_GMAIL_APP_PASSWORD in .env\n' +
      'Get an App Password from: https://myaccount.google.com/apppasswords'
    );
  }

  return new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: address,
      pass: password,
    },
    logger: false, // suppress IMAP debug logs
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Wait for Email
// ─────────────────────────────────────────────────────────────────────────────

export async function waitForEmail(options: EmailSearchOptions): Promise<EmailResult> {
  const waitSeconds = options.waitSeconds ?? 60;
  const pollInterval = options.pollIntervalSeconds ?? 5;
  const deadline = Date.now() + waitSeconds * 1000;

  console.log(`[Email] Waiting up to ${waitSeconds}s for email...`);
  if (options.subject) console.log(`[Email]   Subject contains: "${options.subject}"`);
  if (options.from) console.log(`[Email]   From: "${options.from}"`);

  while (Date.now() < deadline) {
    const client = createImapClient();
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        // Search for recent messages (include seen emails to handle re-runs)
        const searchCriteria: any = {};
        if (options.receivedAfter) searchCriteria.since = options.receivedAfter;
        if (options.from) searchCriteria.from = options.from;
        if (options.subject) searchCriteria.subject = options.subject;

        // First try unseen only, then fall back to all recent
        const unseenCriteria = { ...searchCriteria, seen: false };
        let uids = await client.search(unseenCriteria, { uid: true });
        console.log(`[Email] Found ${uids.length} unseen messages matching search`);

        if (uids.length === 0 && options.receivedAfter) {
          // Fall back: search all recent messages (including seen) from after the timestamp
          uids = await client.search(searchCriteria, { uid: true });
          console.log(`[Email] Fallback: found ${uids.length} total (including seen) messages`);
          // Take only the most recent ones
          if (uids.length > 5) uids = uids.slice(-5);
        }

        // Fetch each matching message
        for (const uid of uids) {
          const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
          if (!msg || !msg.source) continue;

          const parsed = await simpleParser(msg.source);
          const subject = parsed.subject || '';
          const from = parsed.from?.text || '';

          // Subject filter (double-check since IMAP subject search is basic)
          if (options.subject && !subject.toLowerCase().includes(options.subject.toLowerCase())) {
            continue;
          }

          console.log(`[Email] ✅ Found matching email: "${subject}"`);

          return {
            subject,
            from,
            to: parsed.to?.text || '',
            date: parsed.date || null,
            bodyText: parsed.text || '',
            bodyHtml: typeof parsed.html === 'string' ? parsed.html : '',
            messageId: parsed.messageId || '',
          };
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (err: any) {
      console.log(`[Email] Connection error: ${err.message}. Retrying...`);
    }

    // Wait before next poll
    if (Date.now() < deadline) {
      console.log(`[Email] No match yet. Retrying in ${pollInterval}s...`);
      await new Promise(r => setTimeout(r, pollInterval * 1000));
    }
  }

  throw new Error(
    `Email not received within ${waitSeconds}s.\n` +
    `Subject filter: "${options.subject || 'any'}"\n` +
    `Mailbox: ${process.env.TEST_GMAIL_ADDRESS}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract Links from Email
// ─────────────────────────────────────────────────────────────────────────────

export async function extractLinksFromEmail(
  options: EmailSearchOptions & {
    linkDomain?: string;
    linkPattern?: RegExp;
    pickStrategy?: 'first' | 'last' | 'longest' | 'shortest';
  }
): Promise<EmailLinkResult> {

  const email = await waitForEmail(options);

  // Extract ALL links from both HTML and plain text
  const allLinks = extractAllLinks(email);

  console.log(`[Email] Found ${allLinks.length} total links in email`);
  allLinks.forEach((l, i) => console.log(`  ${i + 1}. ${l}`));

  // Filter by domain if provided
  let appLinks = allLinks;

  if (options.linkDomain) {
    appLinks = allLinks.filter(l => l.includes(options.linkDomain!));
    console.log(`[Email] ${appLinks.length} links match domain "${options.linkDomain}"`);
  }

  if (options.linkPattern) {
    appLinks = appLinks.filter(l => options.linkPattern!.test(l));
    console.log(`[Email] ${appLinks.length} links match pattern`);
  }

  // Pick the best link based on strategy
  let primaryLink = '';

  if (appLinks.length === 0) {
    console.warn('[Email] No links matched filter. Using all links as fallback.');
    appLinks = allLinks;
  }

  if (appLinks.length === 1) {
    primaryLink = appLinks[0];
  } else if (appLinks.length > 1) {
    const strategy = options.pickStrategy ?? 'first';
    switch (strategy) {
      case 'first': primaryLink = appLinks[0]; break;
      case 'last': primaryLink = appLinks[appLinks.length - 1]; break;
      case 'longest': primaryLink = appLinks.reduce((a, b) => a.length > b.length ? a : b); break;
      case 'shortest': primaryLink = appLinks.reduce((a, b) => a.length < b.length ? a : b); break;
    }
    console.log(`[Email] Multiple links found. Using "${strategy}" strategy: ${primaryLink}`);
  }

  if (!primaryLink) {
    throw new Error(
      `No links found in email "${email.subject}".\n` +
      `Email body preview:\n` +
      (email.bodyText || email.bodyHtml).substring(0, 300)
    );
  }

  console.log(`[Email] Primary link: ${primaryLink}`);

  return {
    allLinks,
    appLinks,
    primaryLink,
    subject: email.subject,
    from: email.from,
    bodyText: email.bodyText,
    bodyHtml: email.bodyHtml,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract every link from email — both HTML and plain text
// ─────────────────────────────────────────────────────────────────────────────

function extractAllLinks(email: EmailResult): string[] {
  const links = new Set<string>();

  // From HTML: extract href attributes
  if (email.bodyHtml) {
    const hrefRegex = /href=["']?(https?:\/\/[^"'\s>]+)["']?/gi;
    let match;
    while ((match = hrefRegex.exec(email.bodyHtml)) !== null) {
      links.add(cleanUrl(match[1]));
    }
  }

  // From plain text: extract bare URLs
  if (email.bodyText) {
    const urlRegex = /https?:\/\/[^\s<>"'\r\n]+/gi;
    let match;
    while ((match = urlRegex.exec(email.bodyText)) !== null) {
      links.add(cleanUrl(match[0]));
    }
  }

  // Remove tracking/unsubscribe links
  const skipPatterns = [
    /unsubscribe/i,
    /tracking/i,
    /pixel/i,
    /open\.php/i,
    /click\.php/i,
    /mailto:/i,
  ];

  return [...links].filter(
    link => !skipPatterns.some(p => p.test(link))
  );
}

function cleanUrl(url: string): string {
  return url.replace(/[.,;)}\]]+$/, '').trim();
}
