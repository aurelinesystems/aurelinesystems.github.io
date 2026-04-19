/**
 * Aureline Systems — Contact form backend
 * Google Apps Script web app (targets a sheet by explicit ID)
 *
 * What it does:
 *   1. Receives POST requests from the website contact form
 *   2. Appends each submission as a new row in the target Google Sheet
 *   3. Emails you a notification with the submitter's details
 *
 * No credentials live on the website. The script runs as the Google
 * account that owns it (aurelinesystems@gmail.com), so it has permission
 * to write to the sheet and send mail.
 *
 * ─────────────────────────────────────────────────────────────
 * SETUP SUMMARY (already done — keep this for reference)
 * ─────────────────────────────────────────────────────────────
 *  1. Created a Google Sheet with headers in row 1:
 *       Timestamp | Name | Email | Phone | Company | Message
 *     Its ID is hardcoded in SHEET_ID below.
 *
 *  2. Created this Apps Script project (standalone OR inside the sheet
 *     — either works because we use SpreadsheetApp.openById).
 *
 *  3. Deployed as a Web App:
 *       Deploy → New deployment → Type: Web app
 *       Execute as: Me (aurelinesystems@gmail.com)
 *       Who has access: Anyone
 *     Authorized every scope Google asked for (Sheets, Gmail, etc.).
 *
 *  4. Pasted the web-app URL into APPS_SCRIPT_URL in script.js.
 *
 * ─────────────────────────────────────────────────────────────
 * AFTER EDITING THIS FILE
 * ─────────────────────────────────────────────────────────────
 * Pushing this file to GitHub does NOT update the live Apps Script.
 * Whenever you change this code:
 *   1. Paste the new version into the Apps Script editor and Save.
 *   2. Deploy → Manage deployments → pencil icon → Version: "New version"
 *      → Deploy.  (The web app URL stays the same, so script.js is fine.)
 *
 * ─────────────────────────────────────────────────────────────
 * TROUBLESHOOTING
 * ─────────────────────────────────────────────────────────────
 * - Run `runDiagnostic` from the Apps Script editor at any time to
 *   verify the script can write to the sheet AND send email.
 *   Look at the Executions tab (left sidebar) for error details.
 * - Emails may land in Spam the first time. Mark "Not spam" once
 *   and Gmail remembers.
 * - To stop accepting submissions: Deploy → Manage deployments →
 *   trash icon on the active deployment.
 */

// Target spreadsheet ID — the long string in the sheet URL between /d/ and /edit:
//   https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit
// Hardcoding the ID means this script works whether it's bound to the
// sheet or standalone, and removes any "which sheet is active?" ambiguity.
const SHEET_ID = '1XpegBtawZhrXjC9qw9762DEt7mBGROv49j08Yig2tRQ';

// Address that receives the "new inquiry" notification email.
const NOTIFY_EMAIL = 'aurelinesystems@gmail.com';

// Subject prefix for notification emails (easy Gmail filtering).
const SUBJECT_PREFIX = '[Aureline Inquiry]';

// Soft rate limit — reject more than this many submissions from the same
// IP/email within the window (prevents accidental duplicates and simple abuse).
const RATE_LIMIT_PER_HOUR = 10;

/**
 * Entry point for browser POSTs from the website contact form.
 */
function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    // Honeypot — bots fill hidden fields. Silently accept and discard.
    if (p.website) {
      return _json({ ok: true });
    }

    // Sanitize and bound inputs (defense in depth — HTML already has maxlength).
    const name    = _clean(p.name, 200);
    const email   = _clean(p.email, 200);
    const phone   = _clean(p.phone, 50);
    const company = _clean(p.company, 200);
    const message = _clean(p.message, 2000);

    if (!name || !email || !message) {
      return _json({ ok: false, error: 'missing_fields' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return _json({ ok: false, error: 'bad_email' });
    }

    // Rate limit per email in the last hour.
    if (_overRateLimit(email)) {
      return _json({ ok: false, error: 'rate_limited' });
    }

    const timestamp = new Date();

    // Append to the target sheet (by explicit ID, not "active sheet").
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    sheet.appendRow([timestamp, name, email, phone, company, message]);

    // Send the notification email.
    const subject = `${SUBJECT_PREFIX} ${name}${company ? ' — ' + company : ''}`;
    const plain = [
      'New contact form submission — Aureline Systems',
      '',
      'Name:    ' + name,
      'Email:   ' + email,
      'Phone:   ' + (phone || '—'),
      'Company: ' + (company || '—'),
      '',
      'Message:',
      message,
      '',
      '— Received ' + timestamp.toISOString(),
    ].join('\n');

    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: subject,
      body: plain,
      replyTo: email, // hit Reply in Gmail to reply directly to them
      name: 'Aureline Systems Website',
    });

    return _json({ ok: true });
  } catch (err) {
    console.error(err);
    return _json({ ok: false, error: 'server_error' });
  }
}

/**
 * Health check — opening the deployment URL in a browser shows this.
 */
function doGet() {
  return ContentService
    .createTextOutput('Aureline Systems — contact endpoint is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * DIAGNOSTIC — run this once from the Apps Script editor to verify
 * that email sending works and that the script has the right
 * authorization scopes. It writes a test row to the sheet and sends
 * yourself a test email.
 *
 * How to run:
 *   1. Open your Apps Script project.
 *   2. In the function dropdown at the top, select `runDiagnostic`.
 *   3. Click Run.
 *   4. If prompted, click Authorize access and grant every scope
 *      (Google will ask for Sheets + Gmail). This step is what can
 *      be missing if email silently fails.
 *   5. Check your inbox and the sheet.
 */
function runDiagnostic() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  const stamp = new Date();
  sheet.appendRow([stamp, 'Diagnostic', NOTIFY_EMAIL, '', 'Aureline Systems', 'Test from runDiagnostic()']);

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: SUBJECT_PREFIX + ' diagnostic test',
    body: 'If you\u2019re reading this, the contact script can write to your sheet and send you email.\n\nSent at ' + stamp.toISOString(),
    name: 'Aureline Systems Website',
  });

  const quota = MailApp.getRemainingDailyQuota();
  console.log('Diagnostic complete. Remaining daily mail quota: ' + quota);
}

// ───── helpers ─────

function _clean(v, max) {
  return String(v == null ? '' : v).slice(0, max).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function _overRateLimit(email) {
  const cache = CacheService.getScriptCache();
  const key = 'rl:' + email.toLowerCase();
  const raw = cache.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= RATE_LIMIT_PER_HOUR) return true;
  cache.put(key, String(count + 1), 60 * 60); // 1 hour TTL
  return false;
}
