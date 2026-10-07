# CTF Analyst Academy

A complete, self-contained CTF training lab that runs **entirely offline** in a browser.
No server, no build step, no npm install, no network calls, no external fonts or CDNs -
open `index.html` and the whole database of evidence, challenges, campaigns, badges and
progress tracking is already there.

Everything in it is **fictional by construction**: invented people, invented companies,
invented hosts on the reserved `.invalid` TLD, addresses from the documentation ranges
(`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`), invented hashes and invented
flags. The purpose is to teach the *analyst mindset* - classify, correlate, verify,
document - not to build capability against real systems.

---

## 1. Quick start

**Option A - just open it**

Double-click `index.html`. Progress is stored in `localStorage` under the key
`ctf-analyst-academy.progress.v1`. If storage is blocked (some browsers block it for
`file://`), the app falls back to an in-memory store and says so on the PROGRESS page.

**Option B - serve it (recommended, and what the preview uses)**

```bash
cd ctf-analyst-academy
python3 -m http.server 8000 --bind 0.0.0.0
# then open http://localhost:8000/
```

**Option C - verify the content without a browser**

```bash
node tools/verify.js    # re-proves every artifact + audits the database (2305 assertions)
node tools/smoke.js     # drives the real UI headlessly (1415 checks)
node tools/gen-artifacts.js   # regenerates assets/js/artifacts.js deterministically
```

---

## 2. What is inside

| | |
|---|---|
| Challenges | **102** (77 standalone + 25 campaign stages) |
| Total points on the board | **29,145** |
| Categories | **11** |
| Difficulty tiers | **5** (Beginner → Expert) |
| Mystery campaigns | **5**, five stages each, 7,200 points combined |
| Badges | **22** |
| Hints | **3 per challenge** (288 total), with escalating point penalties |
| Artifact renderers | **21** evidence types |
| Generated practice items | unlimited, from 7 procedural templates |

### Categories

| Category | Count | What it trains |
|---|---|---|
| Cryptography | 13 | Caesar, Vigenère, XOR, substitution, OTP, hashing, salt, key reuse |
| Encoding | 7 | Base64, URL, ASCII, binary, hex, layered and reversed encodings, Morse |
| Steganography | 5 | LSB in generated images, alpha channel, deviant pixels, PNG carving |
| Digital Forensics | 8 | Magic bytes, strings, metadata, hex offsets, timelines, memory-ish blobs |
| Networking | 9 | IP classification, subnetting, CIDR, ports, packet stories, DNS, tunneling |
| Linux | 8 | Navigation, hidden files, grep, permissions, config drift, investigation |
| Web Security | 9 | Request anatomy, safe vs unsafe output, SQL logic, XSS sandbox, sessions |
| Programming | 6 | Bug finding, code reading, mazes, string surgery, test-driven fixes |
| Reverse Engineering | 6 | Reading obfuscated JS, constants, control flow, VM-style interpreters |
| OSINT | 6 | Fictional profiles, footprints, timelines, attribution contracts |
| Mystery Archive | 25 | The five multi-stage campaigns |

### Difficulty tiers, points and XP

| Tier | Points | XP on solve |
|---|---|---|
| BEGINNER | 50 - 100 | 50 |
| EASY | 100 - 150 | 100 |
| MEDIUM | 200 - 300 | 200 |
| HARD | 350 - 500 | 350 |
| EXPERT | 600 - 1000 | 600 |

Bonuses: **First Solve +50 XP**, **No Hint +25 XP**, **Perfect Investigation +100 XP**
(correct on the first attempt with zero hints). Levels are pure XP: level *n* needs
*n × 250* XP, so level 2 at 250, level 3 at 750, level 4 at 1500, and so on.

Hint penalties are applied to the *points* awarded, never to XP:

| Hint | Cost |
|---|---|
| Hint 1 | free |
| Hint 2 | −10% of the challenge points |
| Hint 3 | −25% of the challenge points |

Every hint reveal asks for confirmation first and shows exactly what the solve will be
worth afterwards ("points if solved now: 150"), so the trade-off is visible before you
commit.

### The five campaigns (Mystery Archive)

Stages unlock in order; finishing a campaign awards the case flag.

| Case | Title | Points | Arc |
|---|---|---|---|
| CASE-001 | The First Signal | 1000 | Encoding → Caesar → Hex → Steganography → final flag |
| CASE-002 | The Silent Archive | 1200 | File analysis → metadata → strings → binary → cipher |
| CASE-003 | The Broken Terminal | 1500 | Filesystem → hidden files → grep → permissions → investigation |
| CASE-004 | Network Ghost | 1500 | IP analysis → DNS → ports → packet simulation → case closure |
| CASE-005 | The Unknown Cipher | 2000 | Pattern recognition → substitution → frequency analysis → multi-layer encoding → final cipher |

---

## 3. Evidence, not "decode this Base64"

Each challenge mounts a real artifact renderer. The 21 types in use:

`text`, `cipher`, `encoded`, `hex`, `hexdump`, `hexdump-inline`, `binary`, `blob`,
`numbers`, `table`, `timeline`, `metadata`, `packet-log`, `case-file`, `grid`, `code`,
`stego-image`, `vfs`, `web-lab`, `sql-lab`, `xss-sandbox`.

Highlights:

- **Generated stego images.** `stego-image` builds a deterministic pixel matrix from a
  seed, draws it to a `<canvas>` at 1:1 with smoothing off, and gives you a pixel
  inspector: pick a row, hover any cell, read `R G B A` and the LSB of each channel.
- **Simulated terminal.** `vfs` mounts an in-memory filesystem image (fictional) with
  `pwd whoami id ls cd cat head tail grep find stat file xxd strings echo history sudo
  clear uname hostname env man`, tab completion, arrow-key history and real permission
  checks against owner/group/mode. `sudo` only works inside the simulation and only for
  views that grant it - your machine is never touched.
- **Web labs.** `web-lab` shows safe-vs-unsafe output side by side, request/response
  traffic, findings and token structure; `sql-lab` walks a boolean-based logic exercise
  against a fixed in-memory table; `xss-sandbox` demonstrates why reflected input is
  dangerous **without ever executing it** - typed text is only inserted as text nodes and
  shown escaped.
- **Analyst workbench.** Under every artifact there is an offline toolbox: Base64, hex,
  binary, ASCII, URL, ROT13, Atbash, Caesar, Vigenère, reverse, XOR - all local, all
  with no network access.
- **Code challenges** run your answer in a sandboxed `new Function` scope with
  `console`, `window`, `document`, `fetch`, `require`, `process`, `eval` and friends
  shadowed, then execute the challenge's test table and show pass/fail per test.

---

## 4. The app

| View | What you can do |
|---|---|
| DASHBOARD | Live totals, daily challenge, random challenge, category grid, recent solves |
| CHALLENGES | Search plus filters for category, difficulty, status (all/unsolved/solved), point range and six sort orders |
| Challenge detail | Briefing → artifact → answer box (with a test runner for code) → hints → writeup with your own notes |
| MYSTERY ARCHIVE | Campaign list and per-case stage tracking with lock states |
| PRACTICE | Procedural generator: 7 categories × 5 difficulties, pick a seed; items award XP only |
| BADGES | All 22 badges with live progress bars |
| PROGRESS | XP/level, category and difficulty bars, skill cloud, solve log, export/import/reset |
| ABOUT | Content inventory, scoring rules, safety notes |

**Daily challenge** is deterministic per local date, so everyone gets the same one on the
same day, and completing it is tracked separately. **Random** skips what you have already
solved when it can.

**Solved panel.** When an answer is accepted you get the ASCII result box:

```
+---------------------------------------------+
|              CHALLENGE SOLVED               |
+---------------------------------------------+
  FLAG ACCEPTED : FLAG{...}
  +XP           : 200 (+25 no hint)
  +POINTS       : 250
  SKILLS        : Caesar Cipher, ...
+---------------------------------------------+
```

with `VIEW WRITEUP`, `NEXT CHALLENGE` and `BACK TO CTF` underneath. The writeup unlocks
the reference explanation and solution path *after* the solve; your own notes are always
editable and can be copied out as Markdown.

**Progress export/import** writes and reads a JSON file through `Blob` + `FileReader`, so
you can move your state between browsers without any server.

---

## 5. Repository layout

```
ctf-analyst-academy/
├── index.html                     page shell, HUD, nav, script order
├── assets/
│   ├── css/style.css              all styling (local, no web fonts)
│   └── js/
│       ├── challenges.js          engine: ciphers, hex/base64/binary, pixels, LSB,
│       │                          hexdump, strings, signatures, IP math, RNG,
│       │                          answer checking, code sandbox, scoring tables
│       ├── artifacts.js           GENERATED evidence payloads (see tools/)
│       ├── renderer.js            artifact -> DOM (21 types) + analyst workbench
│       ├── weblab.js              web/sql/xss lab renderers
│       ├── terminal.js            simulated filesystem + terminal UI
│       ├── state.js               progress, XP, points, badges, persistence, writeups
│       ├── generator.js           procedural practice items (7 templates)
│       ├── app.js                 views, navigation, challenge flow, HUD
│       └── data/
│           ├── vfs.js             the fictional disk image + per-challenge views
│           ├── challenges-foundations.js   BEGINNER tier
│           ├── challenges-crypto.js        challenges-encoding.js
│           ├── challenges-stego.js         challenges-forensics.js
│           ├── challenges-network.js       challenges-linux.js
│           ├── challenges-web.js           challenges-code.js
│           ├── challenges-re.js            challenges-osint.js
│           └── challenges-campaigns.js     the 5 cases + CAMPAIGN_META
└── tools/
    ├── gen-artifacts.js           deterministic builder for artifacts.js (self-asserting)
    ├── verify.js                  independent re-proof of every artifact + DB audit
    ├── smoke.js                   headless UI test through a minimal DOM shim
    └── domshim.js                 the DOM/localStorage/canvas stub smoke.js runs on
```

Script order matters: `challenges.js` → `artifacts.js` → `data/vfs.js` → the category
files → `renderer.js` → `weblab.js` → `terminal.js` → `state.js` → `generator.js` →
`app.js`. The Linux and CASE-003 challenges read `CTF.VFS_VIEWS` at registration time, so
`vfs.js` must come first.

---

## 6. Adding a challenge

A challenge is one object passed to `CTF.register([...])` in a data file:

```js
{
  id: "CRYPTO-014",                 // unique across the database
  title: "Short, evocative",
  category: "Cryptography",         // must exist in CTF.CATEGORIES
  difficulty: "Medium",             // Beginner|Easy|Medium|Hard|Expert
  points: 250,                      // must sit inside the tier band
  objective: "One sentence: the transferable skill this trains.",
  description: "The scenario and exactly what to submit.",
  skills: ["Skill A", "Skill B"],   // >= 2, shown on the card and in the skill cloud
  data: { artifact: "cipher", meta: "...", text: "..." },   // see renderer.js
  answer: { expects: ["FLAG{...}"], contains: true },       // or { type: "code", tests: [...] }
  hints: ["free", "-10%", "-25%"],  // exactly 3
  flag: "FLAG{...}",                // always an accepted answer
  explanation: "Why it works, and what an analyst should learn from it.",
  solutionSteps: ["1. ...", "2. ...", "3. ..."]
}
```

Rules the verifier enforces:

- points inside the tier band, exactly 3 hints, ≥2 skills, non-empty objective /
  description / explanation / flag;
- every listed acceptable answer *and* the flag validate through `CTF.checkAnswer`, and
  `FLAG{definitely_not_it}` must be rejected;
- flag unique database-wide (campaigns may share one case flag across their five stages);
- no real domains, no external URLs in evidence;
- any generated payload (stego pixels, blobs, packet logs, chained ciphers) must be
  produced by `tools/gen-artifacts.js` with a `check` assertion, so `tools/verify.js` can
  re-derive it independently.

After editing data, run `node tools/verify.js && node tools/smoke.js`. If you add or change
evidence values, edit `tools/gen-artifacts.js` and regenerate - never hand-edit
`assets/js/artifacts.js`.

---

## 7. Safety and ethics

- **Offline, always.** No `fetch`, no XHR, no CDN, no analytics, no external font, no
  remote target. Every artifact is generated locally from a seed or written as a literal.
- **Nothing real.** Identities, companies, domains, hashes, credentials and flags are
  invented. Hostnames use `.invalid`; IPs come from the documentation ranges.
- **OSINT is a simulator.** It teaches *how* to structure an investigation against
  fictional profiles; it contains no real person's data and performs no live lookup.
- **Web labs never execute attacker input.** The XSS sandbox renders your text as escaped
  text nodes and explains what *would* happen; the SQL lab evaluates a fixed truth table
  against an in-memory dataset. There is no injection target anywhere in this project.
- **The terminal is a simulation.** `sudo` works only inside the in-memory image, and the
  code sandbox is a training guard, not a security boundary - it exists so a typo cannot
  touch the page, not so untrusted code can be run safely.
- **Reverse engineering uses JavaScript source only.** No binaries, no executables, no
  downloads.
- **Expert means harder thinking, not longer text.** The Expert tier combines several
  concepts (key reuse + frequency analysis, tunneling + entropy, chained transforms with
  non-commuting operations) rather than adding volume.

If you teach from this, the intended lesson for every challenge is the same: state the
observation, name the artifact that supports it, verify it a second way, then write it down.

---

## 8. Browser and environment notes

- Plain ES5-style JavaScript plus `const`/arrow-free DOM code; runs in any modern browser.
- `localStorage` optional (graceful in-memory fallback).
- Canvas is used for stego rendering; the pixel inspector works without image smoothing.
- Works from `file://`, from a static server, or embedded in an iframe.
