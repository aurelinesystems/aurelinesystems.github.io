# Aureline Systems — Website

A minimalist, single-page marketing site for Aureline Systems. Static HTML/CSS/JS,
no build step, no dependencies.

## Files

- `index.html` — all page content and structure
- `styles.css` — design system and layout
- `script.js` — footer year, message counter, and Google Forms submit

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

Full step-by-step setup lives in `apps-script.gs` (the file you paste
into Google). Short version:

1. Create a Google Sheet titled "Aureline Systems — Inquiries".
   Row 1 headers: `Timestamp | Name | Email | Phone | Company | Message`.
2. In the sheet: **Extensions → Apps Script**. Paste the contents of
   `apps-script.gs`. Save.
3. **Deploy → New deployment → Web app**. Execute as **Me**, access
   **Anyone**. Copy the web app URL.
4. Paste that URL into `script.js` as `APPS_SCRIPT_URL`.
5. Commit and push. Submit the form once on the live site to confirm
   a row appears and an email arrives.

### Why this setup

- Your Gmail address is never in the HTML.
- Script runs as your Google account, so it can write to your sheet
  and send mail from your inbox with no credentials on the client.
- Free, no Google Cloud project, no service accounts.
- You get both a **spreadsheet archive** and an **email per submission**.

## Things to replace / customize

| What               | Where                                         |
| ------------------ | --------------------------------------------- |
| Email destination  | `NOTIFY_EMAIL` in `apps-script.gs` (then redeploy)      |
| Sheet destination  | Whichever sheet you bind the Apps Script to             |
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
