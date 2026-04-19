# Aureline Systems — Website

A minimalist, single-page marketing site for Aureline Systems. Static HTML/CSS/JS,
no build step, no dependencies.

## Files

- `index.html` — all page content and structure
- `styles.css` — design system and layout
- `script.js` — footer year, message counter, and contact-form POST
- `campaign-tracker.js` — reads utm_source/utm_campaign and logs QR visits
- `.nojekyll` — tells GitHub Pages not to run Jekyll

Backend code (NOT deployed to the public site — lives in `../server/`):

- `server/contact-form.gs` — Apps Script backend for the contact form
- `server/qr-visits.gs` — Apps Script backend for QR campaign tracking

These files are kept out of `website/` on purpose: they contain the sheet
IDs and the notification email, and there's no reason to serve them
publicly. They're reference copies — the authoritative version runs inside
Google Apps Script.

## Deploy (GitHub Pages)

The site is plain static files. To publish:

1. Push this repo to `github.com/aurelinesystems/<repo>`.
2. In the repo, open **Settings → Pages**.
3. Set **Source: Deploy from a branch**, **Branch: `main` / `/root`**.
4. Save. GitHub Pages will publish at
   `https://aurelinesystems.github.io/<repo>/`
   (or at `https://aurelinesystems.github.io/` if the repo is named
   `aurelinesystems.github.io`).

## Contact form (Google Sheet + email)

The contact form on the site posts to a **Google Apps Script web app**
that you own. That script writes each submission as a row in a Google
Sheet and emails you a notification. No credentials are in the website;
the only value the site knows is a public Apps Script deployment URL.

Full setup notes live in `../server/contact-form.gs`. Current wiring:

- **Sheet ID**: hardcoded in `server/contact-form.gs` (`SHEET_ID`)
- **Notification email**: `NOTIFY_EMAIL` in `server/contact-form.gs`
- **Web app URL**: `APPS_SCRIPT_URL` in `script.js` (public by design)

### Editing the backend later

Pushing changes to `server/contact-form.gs` in this repo does NOT update
Google's running copy. After editing:

1. Paste the new version into the Apps Script editor at
   <https://script.google.com> and **Save**.
2. **Deploy → Manage deployments → pencil → Version: "New version" → Deploy**.
3. The web app URL stays the same, so `script.js` needs no change.

### Diagnostic

If submissions stop landing, in the Apps Script editor select function
`runDiagnostic` and click **Run**. It writes a test row and sends a test
email — revealing any permission or quota issue in the Executions tab.

### Why this setup

- Your Gmail address is never in the HTML.
- Script runs as your Google account, so it can write to your sheet
  and send mail from your inbox with no credentials on the client.
- Free, no Google Cloud project, no service accounts.
- You get both a **spreadsheet archive** and an **email per submission**.

## Things to replace / customize

| What               | Where                                         |
| ------------------ | --------------------------------------------- |
| Email destination  | `NOTIFY_EMAIL` in `server/contact-form.gs` (then redeploy) |
| Sheet destination  | `SHEET_ID` in `server/contact-form.gs` (then redeploy)     |
| Apps Script URL    | `APPS_SCRIPT_URL` in `script.js`                        |
| LinkedIn URL       | `index.html` — search for `linkedin.com/company/aureline-systems` (2 places) |
| Testimonials       | `index.html` — the `<!-- PLACEHOLDER TESTIMONIALS -->` section |
| Company description| `index.html` — hero and "What we do" sections |
| Page title / meta  | `index.html` — top `<head>` block             |

## LinkedIn note

Do **not** create a second personal LinkedIn profile for Aureline Systems.
Instead, create a **LinkedIn Company Page**:

1. On LinkedIn, click **Work → Create a Company Page**.
2. Choose the appropriate company type (Small business / Medium business).
3. Fill in Aureline Systems' name, tagline, and logo.
4. Copy the public URL and paste it into `index.html` (two spots: the hero
   LinkedIn button and the Contact section).

## Local preview

No build step. Open `index.html` directly in a browser, or run any static
server, e.g.:

```powershell
# Python 3
python -m http.server 8080
# then visit http://localhost:8080
```
