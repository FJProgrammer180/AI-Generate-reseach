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

### `cyberlab/` — CyberLab V4 (real accounts, PHP + MySQL)

The V4 upgrade of the academy: the same workstation UI, terminal, labs and
102 challenges, now behind real server-side accounts. PHP 8.2+ with PDO
(prepared statements, native prepares), `password_hash`/`password_verify`,
hardened sessions (HttpOnly + SameSite=Lax, regeneration on login), CSRF on
every write, throttled generic-error login, a 7-table schema
(`cyberlab/database/schema.sql` for MySQL/MariaDB, SQLite mirror for
dev/tests), server-revalidated flags with single-transaction rewards that
can only pay out once, per-account profile/progress/achievements/settings,
an admin panel behind a live database role check, a CLI first-admin tool
with no default credentials anywhere, and a safe one-time import of legacy
localStorage progress that recalculates every award server-side.

```bash
cp cyberlab/.env.example cyberlab/.env        # fill in DB_* credentials
mysql -u root -p < cyberlab/database/schema.sql
php -S 0.0.0.0:8080 -t cyberlab/public cyberlab/bin/serve-router.php
php cyberlab/tests/run.php                    # 103 backend checks (SQLite)
```

Verified at release on PHP 8.3 (WASM) + SQLite: 103 unit + 37 HTTP-cycle +
7 code-grader checks pass, and the untouched academy suites still pass
(2305 + 1415 checks). A live MySQL connection was **not** available in the
build sandbox — see the (Indonesian) [`cyberlab/README.md`](cyberlab/README.md)
for setup, verification SQL, troubleshooting, HTTPS notes, and the honest
limits of an offline-flag dataset.
