# Prompt — Create a new GitHub repo and push to it (Windows / PowerShell)

Paste the section below into Cursor (or any AI coding assistant) and fill in
the four `{{PLACEHOLDERS}}` at the top. The assistant will take it from there.

If you'd rather run the commands yourself, the "Manual commands" section at
the bottom is the same process without the AI wrapper.

---

## Prompt to give an AI assistant

> ### Task
>
> Initialize the folder at `{{LOCAL_PROJECT_PATH}}` as a Git repository, create
> a new GitHub repo named `{{REPO_NAME}}` under the `{{GITHUB_OWNER}}` account
> (or org), and push the current contents to it.
>
> ### Inputs
>
> - **Local project path**: `{{LOCAL_PROJECT_PATH}}`
>   _(e.g. `c:\Users\jenni\OneDrive\Documents\Automations\my-new-project`)_
> - **GitHub owner**: `{{GITHUB_OWNER}}`
>   _(e.g. `aurelinesystems` — your user or org name)_
> - **Repo name**: `{{REPO_NAME}}`
>   _(e.g. `client-portal`; use `{{GITHUB_OWNER}}.github.io` if this is a
>   GitHub Pages user/org site)_
> - **Visibility**: `{{public|private}}`
> - **Is this a GitHub Pages static site?**: `{{yes|no}}`
>
> ### Rules
>
> 1. Environment is **Windows PowerShell**. Use PowerShell-compatible syntax
>    (no `&&`; use `;` or separate commands).
> 2. Check that `git` and `gh` are on PATH first. If either is missing:
>    - `winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements`
>    - `winget install --id GitHub.cli -e --accept-package-agreements --accept-source-agreements`
>    - If the new binary is not on PATH after install (common on Windows
>      with a fresh winget install), extend `$env:PATH` for this session:
>      `$env:PATH = "$env:LOCALAPPDATA\Programs\Git\cmd;$env:LOCALAPPDATA\GitHubCLI;" + $env:PATH`
> 3. Check `gh auth status`. If not authenticated, run `gh auth login`
>    interactively: choose `GitHub.com`, protocol `HTTPS`, auth method
>    `Login with a web browser`. Wait for the user to complete it.
> 4. **Do NOT commit secrets.** Before the first commit:
>    - Create/update a `.gitignore` that excludes at minimum: `.env`,
>      `.env.*`, `*.json` (with allow-list for `package*.json`,
>      `tsconfig*.json`), `*.pem`, `*.key`, `*credentials*`,
>      `*-service-account*`, `node_modules/`, `__pycache__/`, `.venv/`,
>      `venv/`, `*.log`, `.DS_Store`, `Thumbs.db`, `desktop.ini`.
>    - Run `git status` and visually confirm no secret-looking files are
>      staged before committing.
> 5. Make one clean initial commit. Use a concise message:
>    `"Initial commit"` or `"Scaffold {{REPO_NAME}}"`.
> 6. Create the remote and push in a single step via:
>    `gh repo create {{GITHUB_OWNER}}/{{REPO_NAME}} --{{public|private}} --source=. --push --description "<one-line summary>"`
> 7. **If this is a GitHub Pages static site** (`Is this a GitHub Pages
>    static site? = yes`):
>    - Move all site files into a subfolder named `website/` (or `docs/`
>      if the user prefers GitHub's built-in "Deploy from branch /docs"
>      option). `website/` is the convention used elsewhere in this
>      workspace.
>    - Create `.github/workflows/deploy.yml` that uploads only the site
>      subfolder as the Pages artifact. Use the template at the bottom
>      of this file.
>    - Switch Pages source to GitHub Actions:
>      `gh api -X PUT repos/{{GITHUB_OWNER}}/{{REPO_NAME}}/pages -f build_type=workflow`
>    - Wait for the first deploy with `gh run watch <id> --exit-status`,
>      then verify the site responds 200 on its published URL.
> 8. At the end, print:
>    - Repo URL
>    - Commit SHA
>    - Live Pages URL (if applicable)
>    - A one-line summary of what was committed.
>
> ### Done when
>
> `git status` shows a clean working tree, `git log --oneline` shows the
> initial commit, `gh repo view {{GITHUB_OWNER}}/{{REPO_NAME}}` returns
> details, and (for Pages sites) the URL serves HTTP 200.

---

## Manual commands (no AI, just you)

Run these in PowerShell from the project folder.

### 0. One-time prerequisites

```powershell
# Install Git + gh if missing
winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements
winget install --id GitHub.cli -e --accept-package-agreements --accept-source-agreements

# If PowerShell can't find them after install, extend PATH for this session:
$env:PATH = "$env:LOCALAPPDATA\Programs\Git\cmd;$env:LOCALAPPDATA\GitHubCLI;" + $env:PATH

# Authenticate gh (browser flow, ~30 sec)
gh auth login
#   Choose: GitHub.com -> HTTPS -> Login with a web browser
```

### 1. Initialize the repo

```powershell
cd "<PATH-TO-YOUR-PROJECT>"
git init -b main

# Write a sensible .gitignore (adjust for your stack)
@"
.DS_Store
Thumbs.db
desktop.ini
node_modules/
.vscode/
.idea/
*.log

# Secrets - never commit credentials
*.json
!package.json
!package-lock.json
!tsconfig*.json
*-service-account*
*credentials*
*.pem
*.key
.env
.env.*

# Python
__pycache__/
*.pyc
.venv/
venv/
"@ | Set-Content .gitignore -NoNewline
```

### 2. First commit

```powershell
git add -A
git status   # sanity check - nothing secret?
git commit -m "Initial commit"
```

### 3. Create the remote and push

```powershell
# Replace OWNER, NAME, --public|--private, and description
gh repo create OWNER/NAME --public --source=. --push --description "One-line summary"
```

That's it for a non-Pages repo. `gh repo view OWNER/NAME --web` will open it.

### 4. (Optional) GitHub Pages deployment

Only if this repo hosts a static site. Two flavors:

**Flavor A — user/org site (served at `https://OWNER.github.io/`):** repo
name must be exactly `OWNER.github.io`.

**Flavor B — project site (served at `https://OWNER.github.io/REPO/`):**
any repo name works.

Either way, to deploy from a `website/` subfolder:

```powershell
# From the repo root, with site files already inside ./website/
New-Item -ItemType Directory -Force -Path ".github\workflows" | Out-Null

@"
name: Deploy website to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'website/**'
      - '.github/workflows/deploy.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: `${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: website
      - id: deployment
        uses: actions/deploy-pages@v4
"@ | Set-Content .github\workflows\deploy.yml -NoNewline

git add .github/workflows/deploy.yml
git commit -m "Add GitHub Pages deploy workflow"
git push

# Tell GitHub to build Pages via the workflow (not from a branch)
gh api -X PUT repos/OWNER/NAME/pages -f build_type=workflow

# Watch the first deploy
gh run watch (gh run list --limit 1 --json databaseId --jq ".[0].databaseId") --exit-status
```

Live URL:

- Flavor A: `https://OWNER.github.io/`
- Flavor B: `https://OWNER.github.io/NAME/`

---

## Troubleshooting cheatsheet

| Symptom                                                          | Fix                                                                                    |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `git: command not found` after winget install                    | `$env:PATH = "$env:LOCALAPPDATA\Programs\Git\cmd;" + $env:PATH` in the current session |
| `gh: command not found` after winget install                     | `$env:PATH = "$env:LOCALAPPDATA\GitHubCLI;" + $env:PATH`                               |
| `gh auth login` loops or errors                                  | Use the browser flow (not token paste); make sure the device has internet + a browser  |
| `gh repo create` fails with "name already exists"                | Pick a new name, or `gh repo delete OWNER/NAME --yes` first (destructive — be sure)    |
| Push rejected with "protected branch"                            | You pushed to `main` on an org with protection; open a PR instead                      |
| Pages deploy runs but site is 404                                | Wait 1-2 min for first propagation; also check `gh api repos/OWNER/NAME/pages`         |
| Accidentally committed a secret                                  | Revoke the secret NOW at its provider; then `git reset --soft HEAD~1` and re-commit without the file. If already pushed, revoke first, then consider `git filter-repo` or deleting the repo |
| "refusing to allow an OAuth App to create or update workflow"    | Re-run `gh auth login` and include the `workflow` scope when prompted                  |

---

## Security checklist before every first push

- [ ] `.gitignore` covers `.env`, `*.json` credentials, `*.pem`, `*.key`.
- [ ] `git status` shows no suspicious files staged.
- [ ] No API keys, tokens, or passwords pasted into source files.
- [ ] For Pages sites: server-only files (Apps Script, backend secrets) live
      OUTSIDE the `website/` or `docs/` folder that the workflow uploads.
- [ ] For public repos: the repo visibility is deliberately public, not
      accidentally. `gh repo view OWNER/NAME --json visibility` to confirm.
