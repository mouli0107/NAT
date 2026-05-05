import 'dotenv/config';
import { generateFramework } from './server/script-writer-agent.js';
import * as fs from 'fs';
import * as path from 'path';

const START_URL = 'https://demoqa.com/automation-practice-form';
const TEST_NAME = 'Student Registration Form Submission';

const NL_STEPS = [
  'Step 1: Navigate to https://demoqa.com/automation-practice-form',
  'Step 2: Enter "John" in the "First Name" field',
  'Step 3: Enter "Smith" in the "Last Name" field',
  'Step 4: Enter "john.smith@testmail.com" in the "Email" field',
  'Step 5: Click radio button "Male"',
  'Step 6: Enter "9876543210" in the "Mobile Number" field',
  'Step 7: Enter "15 Jan 2000" in the "Date of Birth" field',
  'Step 8: Enter "Maths" in the "Subjects" field',
  'Step 9: Click checkbox "Sports"',
  'Step 10: Click checkbox "Reading"',
  'Step 11: Enter "Flat 23, Baker Street, London" in the "Current Address" field',
  'Step 12: Select "NCR" from the "State" dropdown',
  'Step 13: Select "Delhi" from the "City" dropdown',
  'Step 14: Click button "Submit"',
  'Step 15: Verify text "Thanks for submitting the form"',
];

const EVENTS = NL_STEPS.map((nl, i) => ({
  sequence: i + 1,
  type: i === 0 ? 'page_load' : 'interaction',
  url: START_URL,
  naturalLanguage: nl,
}));

const OUT_DIR = 'C:/Users/chandramouli/Downloads/Nat20-main/Nat20-main/projects/DemoQA-Generated';

async function main() {
  if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('🚀 Generating framework for demoqa.com...\n');

  const generatedFiles = [];

  for await (const event of generateFramework(NL_STEPS, START_URL, TEST_NAME, EVENTS)) {
    if (event.type === 'status') {
      console.log(' ', event.message);
    } else if (event.type === 'error') {
      console.error('\n❌ ERROR:', event.message);
      process.exit(1);
    } else if (event.type === 'thinking') {
      // skip
    } else if (event.type === 'file') {
      const filePath = path.join(OUT_DIR, event.file.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, event.file.content, 'utf8');
      generatedFiles.push(event.file.path);
      console.log(`  ✅ ${event.file.path}`);
    }
  }

  console.log(`\n📦 ${generatedFiles.length} files written to ${OUT_DIR}`);
  console.log('\n─────────────────────────────────────────');
  console.log('Running TypeScript compile check...\n');
}

main().catch(err => { console.error(err); process.exit(1); });
