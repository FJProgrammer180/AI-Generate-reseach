# AI-Generate-reseach
im try to reseach every AI output to do 

## Projects in this repository

### `Visual studio code project/`
Research notes and experiments about reviewing AI-generated output.

### `ctf-analyst-academy/`
A complete, fully offline CTF training lab (built for the "built-in challenge database"
sections of the spec): **102 challenges** across **11 categories** and **5 difficulty
tiers**, **5 multi-stage mystery campaigns**, **22 badges**, XP/levels/points with hint
penalties, search and filtering, daily + random challenge, a procedural practice
generator, writeups with your own notes, and localStorage progress with export/import.

It is static - open `ctf-analyst-academy/index.html` in a browser, or serve the folder:

```bash
cd ctf-analyst-academy
python3 -m http.server 8000 --bind 0.0.0.0
```

No network access, no build step, no dependencies. Every host, person, company, hash,
credential and flag inside it is fictional (`.invalid` hostnames and documentation IP
ranges only), and the terminal, web labs and XSS sandbox are simulations that never touch
your machine or execute learner input as live HTML.

Content is provable without a browser:

```bash
node ctf-analyst-academy/tools/verify.js   # re-derives every artifact + audits the DB
node ctf-analyst-academy/tools/smoke.js    # drives the real UI headlessly
```

See [`ctf-analyst-academy/README.md`](ctf-analyst-academy/README.md) for the full
inventory, scoring rules, architecture map and the guide for adding challenges.

---

## Deployment (Netlify)

This repository is a **monorepo**: the static site lives in `ctf-analyst-academy/`, not at the
repository root. That is what caused the Netlify "Page not found" screen - the site was
publishing the repository root, which contains no `index.html`.

Deployment is configured by [`netlify.toml`](netlify.toml):

```toml
[build]
  command = "echo 'CyberLab is a static site - no build step required.'"
  publish = "ctf-analyst-academy"
```

There is **no build step**: no `package.json`, no bundler, no `dist/`. The published directory
*is* the application folder, and `ctf-analyst-academy/index.html` is the entry point.

`ctf-analyst-academy/netlify.toml` is the matching config for the case where the Netlify site's
**base directory** is set to `ctf-analyst-academy` (Netlify reads `netlify.toml` from the base
directory, so the root file would be ignored). It publishes `.` - the same folder, same result.

Notes:

- **No SPA rewrite.** Navigation is in-page state (`data-view` buttons); there are no
  `/challenges/<id>` style URLs. A blanket `/* → /index.html 200` rule would neither fix
  anything nor be harmless: it would turn genuinely missing assets into HTML served with a
  200 status. Unknown paths correctly 404.
- Any `npm run build` left over in the Netlify site UI is neutralised by the explicit
  `command` above, and the `publish` value in `netlify.toml` takes precedence over the UI.
- There are no functions, no environment variables and no database in this project.

Verify the config before pushing (it catches the 404 class of mistake, including
filename-case errors that only break on Netlify's case-sensitive filesystem):

```bash
node ctf-analyst-academy/tools/check-deploy.js
```

Full pre-deploy gate:

```bash
node ctf-analyst-academy/tools/verify.js \
  && node ctf-analyst-academy/tools/smoke.js \
  && node ctf-analyst-academy/tools/check-deploy.js
```
