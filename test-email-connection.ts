import * as dotenv from 'dotenv';
dotenv.config();
import { extractLinksFromEmail } from './helpers/email';

async function test() {
  console.log('='.repeat(50));
  console.log('NAT 2.0 Gmail Link Extraction Test');
  console.log('='.repeat(50));
  console.log('Mailbox:', process.env.TEST_GMAIL_ADDRESS);
  console.log('');

  try {
    // Discovery mode — no linkDomain filter, get ALL links
    const result = await extractLinksFromEmail({
      subject: 'Fill Form',
      waitSeconds: 20,
      pollIntervalSeconds: 5,
    });

    console.log('');
    console.log('✅ EMAIL FOUND');
    console.log('   Subject:', result.subject);
    console.log('   From:', result.from);
    console.log('');
    console.log('   ALL LINKS IN EMAIL:');
    result.allLinks.forEach((l, i) =>
      console.log(`   ${i + 1}. ${l}`)
    );
    console.log('');
    console.log('   APP LINKS:', result.appLinks.length);
    console.log('   PRIMARY LINK:', result.primaryLink);
    console.log('');
    console.log('   EMAIL BODY PREVIEW:');
    console.log(
      '   ' +
      result.bodyText.substring(0, 300).replace(/\n/g, '\n   ')
    );

  } catch (err: any) {
    if (err.message.includes('not received within')) {
      console.log('✅ Gmail CONNECTION WORKS');
      console.log('   No matching email found in inbox (that is OK)');
      console.log('');
      console.log('   TO TEST LINK EXTRACTION:');
      console.log('   1. Send an email to:', process.env.TEST_GMAIL_ADDRESS);
      console.log('      With subject containing: "Fill Form"');
      console.log('      With a link in the body');
      console.log('   2. Run this script again');
    } else if (err.message.includes('credentials')) {
      console.log('❌ CREDENTIALS ERROR:', err.message);
      console.log('');
      console.log('   Set these in .env:');
      console.log('   TEST_GMAIL_ADDRESS=your@gmail.com');
      console.log('   TEST_GMAIL_APP_PASSWORD=your-app-password');
      console.log('');
      console.log('   Get App Password: https://myaccount.google.com/apppasswords');
    } else {
      console.log('❌ FAILED:', err.message);
    }
  }
}

test();
