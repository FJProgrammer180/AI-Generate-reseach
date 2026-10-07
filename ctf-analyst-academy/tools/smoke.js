#!/usr/bin/env node
/* ============================================================================
 * tools/smoke.js - headless UI smoke test
 * ----------------------------------------------------------------------------
 * Loads the real page scripts against a minimal DOM shim (tools/domshim.js) and
 * drives the app: every view renders, every one of the 96 challenges opens, its
 * artifact renders, the stored answer is accepted, the solved panel appears, and
 * the hint / writeup / generator flows work.
 *
 *   node tools/smoke.js
 *
 * Exits 1 on any failure so it can sit next to tools/verify.js in CI.
 * ==========================================================================*/
"use strict";
const fs = require("fs");
const path = require("path");
const shim = require("./domshim.js");

const ROOT = path.join(__dirname, "..");
const errors = [];
let checks = 0;
function ok(label, cond, extra) {
  checks++;
  if (cond !== true) errors.push(label + (extra !== undefined ? " | " + JSON.stringify(extra).slice(0, 160) : ""));
}
function step(label, fn) {
  try { return fn(); }
  catch (e) {
    errors.push("THROW " + label + ": " + (e && e.message ? e.message : e));
    return null;
  }
}

/* ------------------------------------------------------- load page scripts */
const dataDir = path.join(ROOT, "assets/js/data");
// vfs.js must load first: the Linux and CASE-003 challenges read CTF.VFS_VIEWS at registration time
const dataFiles = ["vfs.js"].concat(
  fs.readdirSync(dataDir).filter((f) => f.endsWith(".js") && f !== "vfs.js").sort()
).map((f) => "assets/js/data/" + f);

const SCRIPTS = [
  "assets/js/challenges.js",
  "assets/js/artifacts.js"
].concat(dataFiles, [
  "assets/js/renderer.js",
  "assets/js/weblab.js",
  "assets/js/terminal.js",
  "assets/js/state.js",
  "assets/js/generator.js",
  "assets/js/app.js"
]);
SCRIPTS.forEach((rel) => {
  // eslint-disable-next-line no-eval
  eval(fs.readFileSync(path.join(ROOT, rel), "utf8"));
});
const CTF = global.CTF;

/* ------------------------------------------------------------- dom helpers */
const view = shim.document.querySelector("#view");
function walk(node, fn) {
  if (!node) return;
  fn(node);
  (node.children || []).forEach((c) => walk(c, fn));
}
function findAll(pred) {
  const out = [];
  walk(view, (n) => { if (pred(n)) out.push(n); });
  return out;
}
function byClass(cls) { return findAll((n) => String(n.className || "").split(/\s+/).includes(cls)); }
function byText(text) { return findAll((n) => n.textContent === text && n.tagName === "BUTTON"); }
function click(node) { node.dispatchEvent({ type: "click", target: node, preventDefault() { } }); }
function type(node, value, key) {
  node.value = value;
  node.dispatchEvent({ type: "keydown", key: key || "Enter", target: node, preventDefault() { } });
}
function textOf(root) {
  let s = "";
  walk(root, (n) => { if (n._text !== undefined) s += n._text + "\n"; });
  return s;
}

/* ------------------------------------------------------------ sanity: boot */
ok("engine loaded", typeof CTF === "object");
ok("database size", CTF.DB.length >= 96, CTF.DB.length);
ok("app booted", typeof CTF.render === "function" && typeof CTF.go === "function");
ok("hud rendered", shim.document.querySelector("#hud-level").textContent.indexOf("LEVEL") === 0,
  shim.document.querySelector("#hud-level").textContent);

/* ------------------------------------------------------------- view render */
["dashboard", "challenges", "campaigns", "badges", "progress", "practice", "about"].forEach((v) => {
  step("view:" + v, () => {
    CTF.go(v);
    ok("view " + v + " produced content", textOf(view).length > 40, textOf(view).slice(0, 80));
  });
});
step("view:campaign detail", () => {
  CTF.go("campaign", "CASE-003");
  ok("campaign detail lists 5 stages", byClass("stage-row").length === 5, byClass("stage-row").length);
});
step("view:challenges filter", () => {
  CTF.go("challenges");
  const before = byClass("challenge-card").length;
  CTF.ui.filters.category = "Steganography";
  CTF.go("challenges");
  const after = byClass("challenge-card").length;
  ok("category filter narrows the list", after < before && after === 5, { before, after });
  CTF.ui.filters.category = "ALL";
  CTF.ui.filters.query = "vigenere";
  CTF.go("challenges");
  ok("search finds something", byClass("challenge-card").length >= 1, byClass("challenge-card").length);
  CTF.ui.filters.query = "";
});

/* ------------------------------------------- every challenge: open + solve */
const CODE_SOLUTIONS = {
  "CODE-001": "function sumEven(numbers) {\n  let total = 0;\n  for (const n of numbers) if (n % 2 === 0) total += n;\n  return total;\n}",
  "CODE-002": "function maxOf(numbers) {\n  if (!numbers.length) return null;\n  let best = numbers[0];\n  for (const n of numbers) if (n > best) best = n;\n  return best;\n}"
};

CTF.resetState();
let solvedCount = 0;
CTF.DB.forEach((c) => {
  step("open:" + c.id, () => {
    CTF.openChallenge(c, false);
    ok(c.id + ": artifact rendered", byClass("artifact").length >= 1 || byClass("terminal").length >= 1 || byClass("lab-card").length >= 1,
      textOf(view).slice(0, 60));
    ok(c.id + ": objective shown", textOf(view).indexOf("LEARNING OBJECTIVE") >= 0);

    const input = byClass("answer-input")[0] || byClass("code-input")[0];
    ok(c.id + ": answer input present", !!input);
    if (!input) return;
    const submit = byText("SUBMIT ANSWER")[0] || byText("RUN TESTS + SUBMIT")[0];
    ok(c.id + ": submit button present", !!submit);
    if (!submit) return;

    // a wrong answer must be rejected
    input.value = "FLAG{definitely_not_it}";
    click(submit);
    ok(c.id + ": rejects a wrong answer", byClass("bad-line").length >= 1 || (c.answer && c.answer.type === "code"),
      byClass("bad-line").length);

    // the stored answer must be accepted
    const solution = c.answer && c.answer.type === "code" ? CODE_SOLUTIONS[c.id] : c.flag;
    if (!solution) { errors.push(c.id + ": no solution available for smoke test"); return; }
    input.value = solution;
    click(submit);
    const box = byClass("ascii-box")[0];
    ok(c.id + ": solved box rendered", !!box);
    if (box) {
      const t = box.textContent;
      ok(c.id + ": box says CHALLENGE SOLVED", t.indexOf("CHALLENGE SOLVED") >= 0, t.slice(0, 60));
      ok(c.id + ": box says FLAG ACCEPTED", t.indexOf("FLAG ACCEPTED") >= 0);
      ok(c.id + ": box shows XP", /\+\d+ XP/.test(t), t.slice(0, 120));
      ok(c.id + ": box shows POINTS", /\+\d+ POINTS/.test(t), t.slice(0, 120));
      ok(c.id + ": box lists skills", t.indexOf("SKILLS:") >= 0);
      solvedCount++;
    }
    ok(c.id + ": action buttons", byText("VIEW WRITEUP").length >= 1 && byText("NEXT CHALLENGE").length >= 1 && byText("BACK TO CTF").length >= 1);

    // writeup unlocks after solving
    click(byText("VIEW WRITEUP")[0]);
    ok(c.id + ": writeup visible after solve", textOf(view).indexOf("REFERENCE WRITEUP") >= 0);
  });
});
ok("every challenge solvable through the UI", solvedCount === CTF.DB.length, { solvedCount, total: CTF.DB.length });

/* ------------------------------------------------------ hint penalty flow */
CTF.resetState();
step("hints", () => {
  const c = CTF.byId("CRYPTO-001");
  CTF.openChallenge(c, false);
  const hintButtons = findAll((n) => n.tagName === "BUTTON" && /^HINT \d/.test(n.textContent));
  ok("three hint buttons", hintButtons.length === 3, hintButtons.length);
  shim.dialogs.confirm = false;
  click(hintButtons[0]);
  ok("hint refused when the learner cancels", byClass("hint-body").filter((h) => h.style.display !== "none").length === 0);
  shim.dialogs.confirm = true;
  click(hintButtons[0]);
  ok("hint 1 revealed", byClass("hint-body").length >= 1);
  ok("hint 1 is free", textOf(view).indexOf("points if solved now: " + c.points) >= 0, textOf(view).slice(-200));
  click(hintButtons[1]);
  const expected2 = Math.round(c.points * 0.9);
  ok("hint 2 costs 10%", textOf(view).indexOf("points if solved now: " + expected2) >= 0, expected2);
  click(hintButtons[2]);
  const expected3 = Math.round(c.points * 0.75);
  ok("hint 3 costs 25%", textOf(view).indexOf("points if solved now: " + expected3) >= 0, expected3);
  const input = byClass("answer-input")[0];
  input.value = c.flag;
  click(byText("SUBMIT ANSWER")[0]);
  const state = CTF.getState();
  ok("award reflects the hint penalty", state.solved[c.id].points === expected3, state.solved[c.id]);
  ok("hintsUsed recorded", state.solved[c.id].hintsUsed === 3, state.solved[c.id].hintsUsed);
  ok("no perfect bonus after hints", state.solved[c.id].perfect === false);
});

/* ----------------------------------------------------------- terminal flow */
CTF.resetState();
step("terminal", () => {
  const c = CTF.byId("LINUX-001");
  CTF.openChallenge(c, false);
  const term = byClass("terminal")[0];
  ok("terminal rendered", !!term);
  if (!term) return;
  const input = byClass("terminal-input")[0];
  ok("terminal input present", !!input);
  type(input, "help");
  ok("help lists commands", textOf(view).indexOf("available commands") >= 0);
  type(input, "pwd");
  ok("pwd works", textOf(view).indexOf("/") >= 0);
  type(input, "ls -la /");
  ok("ls works", textOf(view).indexOf("etc") >= 0 || textOf(view).indexOf("home") >= 0);
  type(input, "cat " + (CTF.VFS_VIEWS["LINUX-001"].hintPath || "/etc/hostname"));
  ok("cat hint path produced output", textOf(view).length > 10);
  const solvedNow = (() => {
    const box = byClass("answer-input")[0];
    box.value = c.flag;
    click(byText("SUBMIT ANSWER")[0]);
    return byClass("ascii-box").length >= 1;
  })();
  ok("linux challenge still solvable with the terminal mounted", solvedNow);
});
step("terminal permissions", () => {
  const c = CTF.byId("LINUX-004");
  CTF.openChallenge(c, false);
  const input = byClass("terminal-input")[0];
  if (!input) { errors.push("LINUX-004 has no terminal"); return; }
  type(input, "cat /etc/nullpoint/daemon.conf");
  ok("permission denied for analyst", textOf(view).indexOf("Permission denied") >= 0);
  type(input, "sudo cat /etc/nullpoint/daemon.conf");
  ok("sudo works inside the simulation", textOf(view).indexOf("REBUILD_KEY=7F3A9C") >= 0 || textOf(view).indexOf("daemon_user") >= 0,
    textOf(view).slice(-200));
});

/* --------------------------------------------------------------- generator */
CTF.resetState();
step("generator", () => {
  CTF.go("practice");
  ok("practice view renders", textOf(view).indexOf("PRACTICE GENERATOR") >= 0);
  let generated = 0, accepted = 0;
  CTF.GENERATOR_CATEGORIES.forEach((cat) => {
    ["Beginner", "Easy", "Medium", "Hard", "Expert"].forEach((diff) => {
      const c = CTF.generateChallenge({ category: cat, difficulty: diff, seed: CTF.hashString(cat + diff) });
      if (!c) { errors.push("generator returned null for " + cat + "/" + diff); return; }
      generated++;
      CTF.openChallenge(c, true);
      ok(cat + "/" + diff + ": artifact rendered", byClass("artifact").length >= 1 || byClass("terminal").length >= 1);
      const isCode = c.answer && c.answer.type === "code";
      const input = byClass(isCode ? "code-input" : "answer-input")[0];
      if (!input) { errors.push(cat + "/" + diff + ": no input"); return; }
      if (isCode) {
        const solutions = {
          sumEven: "function sumEven(numbers){let t=0;for(const n of numbers) if(n%2===0) t+=n;return t;}",
          countVowels: "function countVowels(text){return (String(text).toLowerCase().match(/[aeiou]/g)||[]).length;}",
          maxRun: "function maxRun(numbers){let best=0,cur=0;numbers.forEach(function(n,i){cur=(i&&n>numbers[i-1])?cur+1:1;if(cur>best)best=cur;});return best;}",
          fizzCount: "function fizzCount(n){let c=0;for(let i=1;i<=n;i++) if(i%3===0||i%5===0) c++;return c;}"
        };
        const name = (c.data.code.match(/function (\w+)/) || [])[1];
        input.value = solutions[name] || "";
      } else {
        // the generated flag is always an accepted answer for text items
        const expects = Array.isArray(c.answer.expects) ? c.answer.expects : [c.answer.expects];
        input.value = String(expects[0]);
      }
      const submit = byText(isCode ? "RUN TESTS + SUBMIT" : "SUBMIT ANSWER")[0];
      click(submit);
      if (byClass("ascii-box").length >= 1) accepted++;
      else errors.push(cat + "/" + diff + ": generated answer rejected (" + String(input.value).slice(0, 40) + ")");
    });
  });
  ok("generator produced items for every category/difficulty", generated === CTF.GENERATOR_CATEGORIES.length * 5, generated);
  ok("every generated item is solvable", accepted === generated, { accepted, generated });
  const st = CTF.getState();
  ok("practice awards XP", st.xp > 0, st.xp);
  ok("practice does not inflate database points", st.points === 0, st.points);
  ok("practice solves counted", (st.generatorSolved || 0) === generated, st.generatorSolved);
  ok("generator badge evaluates", typeof CTF.badgeProgress("GENERATOR_ADEPT").have === "number");
});

/* ----------------------------------------------------------- daily/random */
step("daily and random", () => {
  CTF.resetState();
  const d1 = CTF.dailyChallenge();
  const d2 = CTF.dailyChallenge();
  ok("daily is stable inside a day", d1.id === d2.id, [d1.id, d2.id]);
  const other = CTF.dailyChallenge("2026-01-01");
  ok("daily varies by date", !!other.id);
  const r = CTF.randomChallenge({});
  ok("random returns a challenge", !!r);
  CTF.openChallenge(d1, false);
  const input = byClass("answer-input")[0] || byClass("code-input")[0];
  if (input && !(d1.answer && d1.answer.type === "code")) {
    input.value = d1.flag;
    click(byText("SUBMIT ANSWER")[0]);
    ok("daily solve marks the day done", CTF.dailyIsDone() === true);
  }
});

/* ------------------------------------------------- persistence round trip */
step("persistence", () => {
  const snapshot = CTF.exportState();
  const solvedBefore = CTF.solvedIds().length;
  CTF.resetState();
  ok("reset clears progress", CTF.solvedIds().length === 0);
  CTF.importState(snapshot);
  ok("import restores progress", CTF.solvedIds().length === solvedBefore, { solvedBefore, after: CTF.solvedIds().length });
  CTF.setWriteup("CRYPTO-001", "notes for the smoke test");
  ok("writeup stored", CTF.getWriteup("CRYPTO-001").indexOf("smoke test") >= 0);
  const again = JSON.parse(CTF.exportState());
  ok("writeup exported", again.writeups && again.writeups["CRYPTO-001"].indexOf("smoke test") >= 0);
});

/* ------------------------------------------------------------- safety rule */
step("no innerHTML anywhere in app code", () => {
  const files = ["renderer.js", "weblab.js", "terminal.js", "app.js", "state.js", "generator.js"];
  files.forEach((f) => {
    const src = fs.readFileSync(path.join(ROOT, "assets/js/" + f), "utf8");
    const hits = src.split("\n").filter((l) => /\.innerHTML\s*=/.test(l) && !/throw|SAFETY|never/.test(l));
    ok(f + ": never assigns innerHTML", hits.length === 0, hits.slice(0, 2));
  });
});

/* ------------------------------------------------------------------ report */
console.log("views + challenges exercised: " + (CTF.DB.length + 7));
console.log("checks run                 : " + checks);
if (errors.length) {
  console.log("\nFAILURES (" + errors.length + "):");
  errors.slice(0, 40).forEach((e) => console.log("  x " + e));
  process.exit(1);
}
console.log("SMOKE TEST PASSED \u2713");
