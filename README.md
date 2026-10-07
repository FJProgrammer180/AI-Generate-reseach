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
