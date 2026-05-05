/**
 * ASTRA Mailer Service
 * ────────────────────────────────────────────────────────────────────────────
 * Sends transactional emails via SMTP (Gmail App Password by default).
 *
 * Required .env variables:
 *   SMTP_HOST         smtp.gmail.com          (or your mail server)
 *   SMTP_PORT         587                     (465 for SSL, 587 for TLS)
 *   SMTP_USER         your-sender@gmail.com
 *   SMTP_PASS         your-app-password       (Gmail App Password — not your login password)
 *   SMTP_FROM_NAME    ASTRA Platform          (display name shown to recipients)
 *
 * For Gmail: generate an App Password at
 *   https://myaccount.google.com/apppasswords
 *   (requires 2FA enabled on the Google account)
 */

import nodemailer from 'nodemailer';

// ── Transporter (created lazily so missing env vars don't crash startup) ──────

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      'Email not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in .env\n' +
      'For Gmail: use smtp.gmail.com + an App Password from https://myaccount.google.com/apppasswords'
    );
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,   // true for port 465 (SSL), false for 587 (STARTTLS)
    auth: { user, pass },
  });

  return _transporter;
}

// ── From address ──────────────────────────────────────────────────────────────

function fromAddress(): string {
  const name = process.env.SMTP_FROM_NAME || 'ASTRA Platform';
  const addr = process.env.SMTP_USER || '';
  return `"${name}" <${addr}>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface WelcomeEmailOptions {
  to: string;
  username: string;
  temporaryPassword: string;
  loginUrl?: string;
  /** Modules the user has access to (undefined = full access) */
  allowedModules?: string[] | null;
}

/**
 * Sends a Welcome / Account Created email to a newly provisioned user.
 * Fires-and-forgets — errors are logged but never thrown so they don't
 * block the HTTP response.
 */
export async function sendWelcomeEmail(opts: WelcomeEmailOptions): Promise<void> {
  const loginUrl = opts.loginUrl || `${process.env.APP_URL || 'http://localhost:5000'}/login`;

  const moduleList = opts.allowedModules && opts.allowedModules.length > 0
    ? opts.allowedModules.map(m => MODULE_LABELS[m] ?? m)
    : null;

  const html = buildWelcomeHtml({ ...opts, loginUrl, moduleList });
  const text = buildWelcomeText({ ...opts, loginUrl, moduleList });

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: fromAddress(),
      to: opts.to,
      subject: `Welcome to ASTRA — Your account is ready`,

      html,
      text,
    });
    console.log(`[Mailer] Welcome email sent to ${opts.to} — messageId: ${info.messageId}`);
  } catch (err: any) {
    // Non-fatal — user is already created, just log the failure
    console.error(`[Mailer] Failed to send welcome email to ${opts.to}: ${err.message}`);
  }
}

// ── Module ID → readable label map ───────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  'recorder':           'Recording Studio',
  'test-library':       'Test Library',
  'test-management':    'Test Management',
  'functional-testing': 'Autonomous Testing',
  'sprint-agent':       'Generate from User Stories',
  'execution-mode':     'Execution Mode',
  'visual-regression':  'Visual Regression',
  'synthetic-data':     'Synthetic Data',
  'nradiverse':         'AI Quality Engine',
  'reports':            'Reports & Analytics',
  'import-export':      'Import / Export',
  'projects':           'Project History',
  'architecture':       'Architecture Diagram',
};

// ── Email templates ───────────────────────────────────────────────────────────

interface TemplateVars {
  to: string;
  username: string;
  temporaryPassword: string;
  loginUrl: string;
  moduleList: string[] | null;
}

function buildWelcomeHtml(v: TemplateVars): string {
  const modulesSection = v.moduleList
    ? `
      <tr>
        <td style="padding:0 40px 28px">
          <p style="margin:0 0 12px;font-size:14px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em">
            Your Module Access
          </p>
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%">
            <tr>
              <td>
                ${v.moduleList.map(m => `
                  <span style="display:inline-block;margin:3px 4px;padding:4px 12px;background:#ede9fe;color:#4f46e5;border-radius:20px;font-size:13px;font-weight:500">
                    ${m}
                  </span>`).join('')}
              </td>
            </tr>
          </table>
          <p style="margin:12px 0 0;font-size:12px;color:#9ca3af">
            Default modules (Dashboard, Settings, Integrations, Framework Catalog, Help) are always available.
          </p>
        </td>
      </tr>`
    : `
      <tr>
        <td style="padding:0 40px 28px">
          <p style="margin:0;font-size:14px;color:#6b7280">
            You have <strong style="color:#4f46e5">full access</strong> to all ASTRA modules.
          </p>
        </td>
      </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Welcome to ASTRA</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;padding:40px 0">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="560" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

          <!-- ── Header ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:36px 40px 32px;text-align:center">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:rgba(255,255,255,.15);border-radius:14px;margin-bottom:16px">
                <span style="font-size:28px">⚡</span>
              </div>
              <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-.02em">
                Welcome to ASTRA
              </h1>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,.8)">
                AI-Powered Software Testing Platform
              </p>
            </td>
          </tr>

          <!-- ── Greeting ── -->
          <tr>
            <td style="padding:36px 40px 24px">
              <p style="margin:0 0 16px;font-size:16px;color:#111827;font-weight:600">
                Hello ${escapeHtml(v.username.split('@')[0])} 👋
              </p>
              <p style="margin:0;font-size:15px;color:#374151;line-height:1.6">
                Your ASTRA account has been created. You can now log in using the credentials below.
                For security, you will be asked to <strong>set a new password</strong> on your first login.
              </p>
            </td>
          </tr>

          <!-- ── Credentials ── -->
          <tr>
            <td style="padding:0 40px 28px">
              <table cellpadding="0" cellspacing="0" border="0" width="100%"
                style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #e2e8f0">
                    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;font-weight:600">Username</p>
                    <p style="margin:0;font-size:15px;color:#111827;font-weight:600;font-family:'Courier New',monospace">
                      ${escapeHtml(v.username)}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px">
                    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;font-weight:600">Temporary Password</p>
                    <p style="margin:0;font-size:15px;color:#111827;font-weight:600;font-family:'Courier New',monospace;letter-spacing:.05em">
                      ${escapeHtml(v.temporaryPassword)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Module Access ── -->
          ${modulesSection}

          <!-- ── CTA Button ── -->
          <tr>
            <td style="padding:0 40px 36px;text-align:center">
              <a href="${v.loginUrl}"
                style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:.01em;box-shadow:0 4px 14px rgba(79,70,229,.4)">
                Log In to ASTRA →
              </a>
            </td>
          </tr>

          <!-- ── Security Note ── -->
          <tr>
            <td style="padding:0 40px 36px">
              <table cellpadding="0" cellspacing="0" border="0" width="100%"
                style="background:#fef9c3;border:1px solid #fde68a;border-radius:10px;padding:16px 20px">
                <tr>
                  <td style="padding:16px 20px">
                    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6">
                      <strong>⚠️ Security reminder:</strong> This is a temporary password.
                      You will be prompted to choose a new password immediately after your first login.
                      Do not share your credentials with anyone.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af">
                ASTRA — AI-Powered Software Testing Platform
              </p>
              <p style="margin:0;font-size:11px;color:#d1d5db">
                If you did not expect this email, please contact your administrator.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildWelcomeText(v: TemplateVars): string {
  const modules = v.moduleList
    ? `\nYour module access:\n${v.moduleList.map(m => `  • ${m}`).join('\n')}\n`
    : '\nYou have full access to all ASTRA modules.\n';

  return `Welcome to ASTRA
================

Hello ${v.username.split('@')[0]},

Your ASTRA account has been created. Log in with the credentials below.
You will be asked to set a new password on your first login.

Username:           ${v.username}
Temporary Password: ${v.temporaryPassword}
${modules}
Log in here: ${v.loginUrl}

⚠  Security reminder: Change your password immediately after logging in.
   Do not share your credentials with anyone.

—
ASTRA — AI-Powered Software Testing Platform
If you did not expect this email, contact your administrator.
`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
