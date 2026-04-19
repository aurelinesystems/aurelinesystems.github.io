/**
 * Aureline Systems — QR campaign visit logger
 * Google Apps Script web app (separate from the contact form script)
 *
 * What it does:
 *   1. Receives POST requests from campaign-tracker.js on the website.
 *   2. Validates the payload (utm_source=qr, known campaign prefix).
 *   3. Appends one row per qualifying visit to the "Visits" tab of the
 *      dedicated QR Visits spreadsheet.
 *
 * Why this is a *separate* script from apps-script.gs:
 *   - Keeps marketing analytics data isolated from contact inquiries.
 *   - Deploying/editing it carries zero risk to the live contact form.
 *   - Different spreadsheet, different web-app URL, different scopes.
 *
 * ─────────────────────────────────────────────────────────────
 * FIRST-TIME SETUP
 * ─────────────────────────────────────────────────────────────
 *  1. In the target spreadsheet (ID below), confirm there is a tab
 *     named exactly "Visits" with these headers in row 1:
 *       received_at | timestamp | campaign | type | source | url | referrer | user_agent
 *
 *  2. Go to https://script.google.com → New project.
 *     Name it "Aureline Systems — QR Visits".
 *
 *  3. Paste the entire contents of this file into Code.gs and save.
 *
 *  4. In the function dropdown, select `runDiagnostic` and click Run.
 *     Google will prompt for authorization — accept every scope it
 *     asks for (Sheets, external request). Verify a "diagnostic" row
 *     appears in the Visits tab.
 *
 *  5. Deploy:
 *       Deploy → New deployment → Type: Web app
 *       Execute as: Me (aurelinesystems@gmail.com)
 *       Who has access: Anyone
 *     Copy the resulting web-app URL.
 *
 *  6. Paste that URL into the QR_SCRIPT_URL constant near the top of
 *     website/campaign-tracker.js, then push to deploy.
 *
 * ─────────────────────────────────────────────────────────────
 * AFTER EDITING THIS FILE
 * ─────────────────────────────────────────────────────────────
 * Pushing to GitHub does NOT update the live Apps Script. Whenever
 * you change this code:
 *   1. Paste the new version into the Apps Script editor and Save.
 *   2. Deploy → Manage deployments → pencil icon → Version: "New version"
 *      → Deploy.  (The web-app URL stays the same.)
 */

// Target spreadsheet ID — from the sheet URL between /d/ and /edit:
//   https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit
const SHEET_ID = '1vQwFrhj5lFdqrRfGuQHXaHH05dZ13SV9d_dWkiGzvcE';

// Name of the tab (worksheet) within that spreadsheet.
const TAB_NAME = 'Visits';

// Campaign prefixes this endpoint will accept. Anything else is
// rejected (defense in depth — campaign-tracker.js already filters).
const ALLOWED_PREFIXES = ['oak_harbor', 'general'];

// Expected utm_source value. Anything else is rejected.
const EXPECTED_SOURCE = 'qr';

// Global soft rate limit — cap how many rows this endpoint writes
// per hour across ALL traffic, to keep a misbehaving client or a
// malicious POSTer from flooding the sheet.
const GLOBAL_RATE_LIMIT_PER_HOUR = 1000;

// Per-campaign dedupe window (seconds). If the same campaign posts
// again within this window from the "same" fingerprint (UA + referrer),
// we silently accept but don't write a second row. Prevents a hot-
// reloading dev page or a refresh loop from stuffing the sheet.
const DEDUPE_WINDOW_SECONDS = 60;

/**
 * Entry point for browser POSTs from campaign-tracker.js.
 */
function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    const source = _clean(p.source, 50).toLowerCase();
    const campaign = _clean(p.campaign, 120).toLowerCase();
    const type = _clean(p.type, 50).toLowerCase();
    const url = _clean(p.url, 2000);
    const referrer = _clean(p.referrer, 2000);
    const userAgent = _clean(p.userAgent, 1000);
    const timestamp = _clean(p.timestamp, 50);

    if (source !== EXPECTED_SOURCE) {
      return _json({ ok: false, error: 'bad_source' });
    }
    if (!_isAllowedCampaign(campaign)) {
      return _json({ ok: false, error: 'bad_campaign' });
    }

    // Silent dedupe — same campaign + UA combination within window.
    const fpKey = 'dedupe:' + campaign + ':' + _hash(userAgent + '|' + referrer);
    const cache = CacheService.getScriptCache();
    if (cache.get(fpKey)) {
      return _json({ ok: true, deduped: true });
    }
    cache.put(fpKey, '1', DEDUPE_WINDOW_SECONDS);

    // Global rate limit.
    if (_overGlobalRateLimit()) {
      return _json({ ok: false, error: 'rate_limited' });
    }

    const receivedAt = new Date();
    const resolvedType = type || _deriveType(campaign);

    // `_csvSafe` defangs any value that starts with = + - @ \t \r so
    // it can't be interpreted as a formula by Google Sheets or by
    // Excel when the data is exported. `campaign`, `type`, and
    // `source` are already constrained to a known allow-list, but we
    // treat them uniformly for consistency.
    const sheet = _getVisitsSheet();
    sheet.appendRow([
      receivedAt,
      _csvSafe(timestamp),
      _csvSafe(campaign),
      _csvSafe(resolvedType),
      _csvSafe(source),
      _csvSafe(url),
      _csvSafe(referrer),
      _csvSafe(userAgent),
    ]);

    return _json({ ok: true });
  } catch (err) {
    console.error(err);
    return _json({ ok: false, error: 'server_error' });
  }
}

/**
 * Health check — opening the deployment URL in a browser shows this.
 * Also a quick way to confirm the script is deployed and reachable.
 */
function doGet() {
  return ContentService
    .createTextOutput('Aureline Systems — QR visit endpoint is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * DIAGNOSTIC — run this once from the Apps Script editor to verify
 * authorization and sheet access. Writes a test row with campaign
 * "general_diagnostic" to the Visits tab.
 *
 * How to run:
 *   1. Open your Apps Script project.
 *   2. In the function dropdown at the top, select `runDiagnostic`.
 *   3. Click Run. If prompted, click Authorize access and grant
 *      every scope Google asks for.
 *   4. Open the target sheet and confirm the diagnostic row appears
 *      at the bottom of the Visits tab.
 */
function runDiagnostic() {
  const sheet = _getVisitsSheet();
  const now = new Date();
  sheet.appendRow([
    now,
    _csvSafe(now.toISOString()),
    _csvSafe('general_diagnostic'),
    _csvSafe('general'),
    _csvSafe('qr'),
    _csvSafe('https://aurelinesystems.github.io/?utm_source=qr&utm_campaign=general_diagnostic'),
    '',
    _csvSafe('runDiagnostic()'),
  ]);
  console.log('Diagnostic row appended to tab "' + TAB_NAME + '".');
}

// ───── helpers ─────

function _getVisitsSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(TAB_NAME);
  if (!sheet) {
    throw new Error('Tab "' + TAB_NAME + '" not found in spreadsheet ' + SHEET_ID);
  }
  return sheet;
}

function _isAllowedCampaign(campaign) {
  if (!campaign) return false;
  for (let i = 0; i < ALLOWED_PREFIXES.length; i++) {
    const prefix = ALLOWED_PREFIXES[i];
    if (campaign === prefix || campaign.indexOf(prefix + '_') === 0) {
      return true;
    }
  }
  return false;
}

function _deriveType(campaign) {
  for (let i = 0; i < ALLOWED_PREFIXES.length; i++) {
    const prefix = ALLOWED_PREFIXES[i];
    if (campaign === prefix || campaign.indexOf(prefix + '_') === 0) {
      return prefix;
    }
  }
  return '';
}

function _clean(v, max) {
  return String(v == null ? '' : v).slice(0, max).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
}

// Formula-injection defense — mirror of the helper in apps-script.gs.
// Prevents a crafted payload like `url==HYPERLINK(...)` from turning
// into a live formula once it lands in the sheet.
function _csvSafe(v) {
  if (v == null) return v;
  if (typeof v !== 'string') return v;
  if (v.length === 0) return v;
  if (/^[=+\-@\t\r]/.test(v)) return "'" + v;
  return v;
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function _overGlobalRateLimit() {
  const cache = CacheService.getScriptCache();
  const key = 'qr_rl_global';
  const raw = cache.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= GLOBAL_RATE_LIMIT_PER_HOUR) return true;
  cache.put(key, String(count + 1), 60 * 60);
  return false;
}

// Tiny non-cryptographic hash — just to keep cache keys short.
function _hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return String(h);
}
