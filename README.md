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

## Contact form (Google Forms)

The form on the site submits directly to a Google Form you own. No backend,
no exposed email, and you get email notifications + a Google Sheet of
responses automatically.

### One-time setup

1. Sign into **aurelinesystems@gmail.com**.
2. Create a new Google Form (<https://forms.google.com>) titled
   e.g. "Aureline Systems — Inquiries" with these fields, in order:
   - **Name** — short answer, required
   - **Email** — short answer, required (enable "Response validation → Text → Email")
   - **Phone** — short answer
   - **Company** — short answer
   - **Message** — paragraph, required
3. Click the form's 3-dot menu → **Get pre-filled link**. Enter recognizable
   values (e.g. `NAME`, `EMAIL`, `PHONE`, `COMPANY`, `MESSAGE`) and click
   **Get link** → **Copy link**.
4. The link looks like:

   ```
   https://docs.google.com/forms/d/e/1FAIpQLSxxxxxxxx/viewform?usp=pp_url
     &entry.111111111=NAME
     &entry.222222222=EMAIL
     &entry.333333333=PHONE
     &entry.444444444=COMPANY
     &entry.555555555=MESSAGE
   ```

5. Open `script.js` and replace:
   - `GOOGLE_FORM_ID` → the `1FAIpQLS…` value
   - `entry.REPLACE_NAME` → `entry.111111111` (etc., one per field)

6. In the Google Form, go to **Responses → ⋮ → Get email notifications for
   new responses**. Turn it on. You'll be emailed each time someone submits.

7. Commit and push. Done.

### Why Google Forms

- Your email address is never in the HTML (no scraping).
- Free, reliable delivery, with a Google Sheet history.
- Built-in spam resistance; the site also has a honeypot field.

## Things to replace / customize

| What               | Where                                         |
| ------------------ | --------------------------------------------- |
| Email destination  | Handled by the Google Form you own — no code change needed. |
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
