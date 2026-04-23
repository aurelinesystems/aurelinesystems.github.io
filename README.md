# aurelinesystems.github.io

Source for the Aureline Systems marketing site at
<https://aurelinesystems.github.io/>.

## What's in this repo

| Path                      | Purpose                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `website/`                | The deployed site. Auto-published to GitHub Pages on push via `.github/workflows/deploy.yml`.|
| `.github/workflows/`      | GitHub Actions — currently just the Pages deploy.                                            |

Everything else (Apps Script backends that power the contact form
and QR visit logger, reusable AI prompts, shared workspace assets)
lives in private sibling repos under the same GitHub org, not here.

## Deployment

`.github/workflows/deploy.yml` triggers on pushes to `main` that
touch `website/**` or the workflow itself. It uploads `website/` as
the Pages artifact and deploys it. Nothing outside `website/` is
ever served by Pages.

## Local development

```powershell
cd website
# Open index.html in a browser, or run any static file server.
```

No build step — hand-written HTML/CSS/JS.

## Sibling local folders (not in this repo)

The following live as sibling folders on the author's machine but
are separate GitHub repos:

| Folder / repo                                    | Visibility | Purpose                                                             |
| ------------------------------------------------ | ---------- | ------------------------------------------------------------------- |
| `aurelinesystems/aureline-automations`           | Private    | Apps Script backends (contact form, QR visits), prompts, workspace. |
| `aurelinesystems/aureline-ledger`                | Private    | Master ledger importers + Gmail scrapers + monthly sync workflow.   |
| `linkedin-autopost/` / `aurelinesystems/linkedin-autopost` | Private | Daily LinkedIn company-page autopost.                               |
| `aurelinesystems/cruise-monitor`                 | Private    | Cruise deal monitor.                                                |
