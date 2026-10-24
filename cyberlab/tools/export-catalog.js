#!/usr/bin/env node
/* ============================================================================
 * export-catalog.js - CyberLab V4 server-side challenge catalog exporter
 * ----------------------------------------------------------------------------
 * Loads the EXISTING CTF Analyst Academy dataset (the same JS files the
 * browser uses, in the same order as tools/verify.js) and writes the
 * server-authoritative subset to app/data/challenges.json:
 *
 *   id, title, category, difficulty, points, campaign, stage,
 *   flag, answer { type, expects[], contains, tests[] }
 *
 * The PHP backend validates submitted flags/answers against THIS file and
 * recomputes every XP/point award itself - it never trusts totals sent by
 * the browser. Run it again whenever the JS dataset changes:
 *
 *   node cyberlab/tools/export-catalog.js
 *
 * Fails (exit 1) on duplicate ids, unknown difficulties/categories, points
 * outside the tier band, or any challenge the exporter cannot represent
 * faithfully (function expects, regex rules it would have to guess at, ...).
 * ==========================================================================*/
"use strict";
const fs = require("fs");
const path = require("path");

const CYBERLAB = path.join(__dirname, "..");
const ACADEMY = path.join(CYBERLAB, "..", "ctf-analyst-academy");
const OUT = path.join(CYBERLAB, "app", "data", "challenges.json");

global.window = global;
global.self = global;
global.btoa = (s) => Buffer.from(s, "binary").toString("base64");
global.atob = (s) => Buffer.from(s, "base64").toString("binary");

function load(rel) {
  // Same technique as ctf-analyst-academy/tools/verify.js.
  eval(fs.readFileSync(path.join(ACADEMY, rel), "utf8")); // eslint-disable-line no-eval
}

load("assets/js/challenges.js");
load("assets/js/artifacts.js");
load("assets/js/data/vfs.js");
// Registration order matters: the server's daily-pick replication must see
// CTF.DB in the exact order the BROWSER builds it (index.html script
// order), so load the data files explicitly in that order - never sorted.
const DATA_ORDER = [
  "challenges-foundations.js", "challenges-crypto.js", "challenges-encoding.js",
  "challenges-stego.js", "challenges-forensics.js", "challenges-network.js",
  "challenges-linux.js", "challenges-web.js", "challenges-code.js",
  "challenges-re.js", "challenges-osint.js", "challenges-campaigns.js",
];
for (const f of DATA_ORDER) load("assets/js/data/" + f);
const onDisk = fs.readdirSync(path.join(ACADEMY, "assets/js/data")).filter((x) => x.startsWith("challenges-"));
for (const f of onDisk) {
  if (!DATA_ORDER.includes(f)) {
    console.error(`EXPORT FAILED: data file ${f} is not in DATA_ORDER - add it in index.html order first`);
    process.exit(1);
  }
}
const CTF = global.CTF;

const problems = [];
const seen = new Set();
const out = [];

for (const c of CTF.DB) {
  if (seen.has(c.id)) problems.push(`duplicate id ${c.id}`);
  seen.add(c.id);

  const diff = CTF.difficulty(c.difficulty);
  if (!diff || diff.id !== c.difficulty) problems.push(`${c.id}: unknown difficulty ${c.difficulty}`);
  if (c.points < diff.min || c.points > diff.max) problems.push(`${c.id}: points ${c.points} outside ${diff.min}-${diff.max}`);
  if (!CTF.categoryById(c.category)) problems.push(`${c.id}: unknown category ${c.category}`);
  if (!c.flag) problems.push(`${c.id}: missing flag`);

  const a = c.answer || {};
  let answer;
  if (a.type === "code") {
    if (!Array.isArray(a.tests) || !a.tests.length) problems.push(`${c.id}: code answer without tests`);
    answer = { type: "code", tests: (a.tests || []).map((t) => ({ call: String(t.call), expect: t.expect })) };
  } else {
    if (typeof a.expects === "function") problems.push(`${c.id}: function expects cannot be exported; resolve it in the dataset first`);
    if (a.regex) problems.push(`${c.id}: regex answers are not exported (PCRE/JS drift); use explicit expects instead`);
    const expects = Array.isArray(a.expects) ? a.expects.map(String) : (a.expects === undefined ? [] : [String(a.expects)]);
    if (!expects.length && !c.flag) problems.push(`${c.id}: neither expects nor flag`);
    answer = {
      type: "text",
      expects,
      contains: !!a.contains,
      strict: !!a.strict,
      caseSensitive: !!a.caseSensitive,
    };
  }

  // Prove the exported record still validates through the original checker.
  if (answer.type === "text") {
    for (const probe of [...answer.expects, c.flag]) {
      if (probe !== undefined && !CTF.checkAnswer(c, probe)) problems.push(`${c.id}: exported answer no longer accepted: ${JSON.stringify(probe)}`);
    }
    if (CTF.checkAnswer(c, "FLAG{definitely_not_it}")) problems.push(`${c.id}: bogus flag accepted`);
  }

  out.push({
    id: c.id,
    title: c.title,
    category: c.category,
    difficulty: c.difficulty,
    points: c.points,
    campaign: c.campaign || null,
    stage: c.stage || null,
    flag: c.flag,
    answer,
  });
}

if (problems.length) {
  console.error("EXPORT FAILED:\n - " + problems.join("\n - "));
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  generatedFrom: "ctf-analyst-academy/assets/js (CTF.DB registration order preserved)",
  count: out.length,
  totalPoints: out.reduce((s, c) => s + c.points, 0),
  campaigns: (global.CTF.CAMPAIGN_META || []).map((m) => ({ id: m.id, title: m.title, points: m.points, stages: m.stages })),
  challenges: out,
}, null, 1) + "\n");

console.log(`wrote ${OUT}`);
console.log(`${out.length} challenges, ${out.reduce((s, c) => s + c.points, 0)} points, ` +
  `${out.filter((c) => c.answer.type === "code").length} code-graded, ` +
  `${out.filter((c) => c.campaign).length} campaign stages`);
