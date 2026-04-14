import * as fs from 'fs';
import * as path from 'path';

/**
 * Shared context file for passing data between independent test cases.
 * TC_FORM_001 writes the form name after creation.
 * TC_FNX/TC_PAY tests read it before running.
 *
 * File: projects/apols-v2/fixtures/.shared-context.json
 */

const CONTEXT_FILE = path.join(__dirname, '.shared-context.json');

export interface SharedContext {
  formName: string;
  createdAt: string;
  publishedAt?: string;
  emailSentAt?: string;
}

/** Write shared context (called by TC_FORM_001 after form creation) */
export function writeSharedContext(data: Partial<SharedContext>) {
  let existing: Partial<SharedContext> = {};
  if (fs.existsSync(CONTEXT_FILE)) {
    try { existing = JSON.parse(fs.readFileSync(CONTEXT_FILE, 'utf-8')); } catch { /* ignore */ }
  }
  const merged = { ...existing, ...data };
  fs.writeFileSync(CONTEXT_FILE, JSON.stringify(merged, null, 2));
  console.log(`[SharedContext] Written to ${CONTEXT_FILE}:`, merged);
}

/** Read shared context (called by TC_PAY/TC_FNX before running) */
export function readSharedContext(): SharedContext {
  if (!fs.existsSync(CONTEXT_FILE)) {
    throw new Error(
      `[SharedContext] File not found: ${CONTEXT_FILE}\n` +
      `Run TC_FORM_001 first to create a form and generate the shared context.`
    );
  }
  const raw = fs.readFileSync(CONTEXT_FILE, 'utf-8');
  const data = JSON.parse(raw) as SharedContext;
  console.log(`[SharedContext] Read form name: "${data.formName}" (created: ${data.createdAt})`);
  return data;
}

/** Get the form name from shared context */
export function getFormName(): string {
  return readSharedContext().formName;
}
