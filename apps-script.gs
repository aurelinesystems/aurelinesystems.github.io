/**
 * Aureline Systems — Contact form backend
 * Google Apps Script (bound to a Google Sheet)
 *
 * This script:
 *   1. Receives POST requests from the website contact form
 *   2. Appends the submission as a new row in the spreadsheet
 *   3. Emails you a notification with the submitter's details
 *
 * No credentials are exposed to the website. The script runs as you,
 * so it has permission to write to your sheet and send from your Gmail.
 *
 * ─────────────────────────────────────────────────────────────
 * SETUP (one-time, ~5 minutes)
 * ─────────────────────────────────────────────────────────────
 * 1. Create the sheet
 *    - Sign into aurelinesystems@gmail.com
 *    - Go to https://sheets.google.com and create a blank sheet
 *    - Name it: "Aureline Systems — Inquiries"
 *    - In row 1, put headers (tab-separate into cells A1..F1):
 *        Timestamp    Name    Email    Phone    Company    Message
 *
 * 2. Open the script editor
 *    - In the sheet: Extensions → Apps Script
 *    - Delete the default `function myFunction() { ... }`
 *    - Paste THIS ENTIRE FILE in
 *    - Click the disk icon to save (name the project "Aureline Contact")
 *
 * 3. Deploy as a web app
 *    - Click "Deploy" (top right) → "New deployment"
 *    - Click the gear icon → choose "Web app"
 *    - Description: "Aureline contact endpoint v1"
 *    - Execute as: **Me (aurelinesystems@gmail.com)**
 *    - Who has access: **Anyone**
 *    - Click "Deploy"
 *    - Authorize when prompted. Google will warn because the app is
 *      unverified (it's your own script). Click "Advanced" →
 *      "Go to Aureline Contact (unsafe)" → "Allow". This is safe because
 *      you wrote and own it.
 *    - Copy the "Web app URL". It looks like:
 *        https://script.google.com/macros/s/AKfycbx..../exec
 *
 * 4. Paste the URL into the website
 *    - Open script.js in this repo
 *    - Replace APPS_SCRIPT_URL with the URL you just copied
 *    - Commit and push. GitHub Pages redeploys in ~30s.
 *
 * That's it. Test by submitting the form on the live site — you should
 * see a new row in the sheet and an email in your inbox within seconds.
 *
 * ─────────────────────────────────────────────────────────────
 * CHANGING SETTINGS LATER
 * ─────────────────────────────────────────────────────────────
 * - To change the notification email, edit NOTIFY_EMAIL below and
 *   redeploy: Deploy → Manage deployments → pencil icon → Version:
 *   "New version" → Deploy.
 * - To stop accepting submissions, Deploy → Manage deployments →
 *   trash icon on the active deployment.
 */

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

    // Append to the sheet this script is bound to.
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
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
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
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
