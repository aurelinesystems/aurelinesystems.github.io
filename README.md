# Aureline Systems — Automations Workspace

Local workspace holding the projects that power Aureline Systems' day-to-day
operations. Each subfolder is a self-contained project; they share nothing
except this root folder and a single `.env` at the top that projects can
optionally pick up.

## Projects

| Folder               | What it is                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `website/`           | Static single-page marketing site for Aureline Systems. Auto-deploys to GitHub Pages on push.        |
| `bitly_qr_manager/`  | Local Python CLI for creating Bitly short links + QR codes for outreach campaigns. Not pushed.       |

## Git / deployment layout

This folder is the root of the `aurelinesystems/aurelinesystems.github.io`
GitHub repo. Only `website/` and `.github/` are published:

- `website/` is deployed to <https://aurelinesystems.github.io/> via the
  GitHub Actions workflow at `.github/workflows/deploy.yml`.
- `bitly_qr_manager/` is gitignored and stays local.
- `.env` is gitignored.
- This `README.md` lives alongside the projects as workspace documentation.

## Quick start

- **Website**: see [`website/README.md`](website/README.md).
- **Bitly QR manager**: see [`bitly_qr_manager/README.md`](bitly_qr_manager/README.md).

## Adding a new project

1. Create a sibling folder at the workspace root (e.g. `new_tool/`).
2. Decide whether it should be pushed or local-only:
   - **Push it** (it's part of what the repo hosts): nothing to do; just commit.
   - **Local only** (tools, experiments, data): add the folder name to
     `.gitignore` alongside `bitly_qr_manager/`.
3. Each local project gets its own `venv`, `README.md`, and dependencies.
