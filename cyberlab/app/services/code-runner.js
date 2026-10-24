#!/usr/bin/env node
/* ============================================================================
 * code-runner.js - sandboxed grader for CyberLab code-graded challenges
 * ----------------------------------------------------------------------------
 * Reads one JSON document { code, tests:[{call, expect}] } from stdin and
 * writes one JSON line { pass, results:[...] } to stdout. The learner code
 * runs in a node:vm context that contains only a muted console and the
 * standard JS intrinsics: no require, no process, no fs, no network, no
 * timers. Each test gets a fresh context and a 1000 ms vm timeout.
 * This mirrors CTF.runCode + checkCode from challenges.js exactly:
 *   __result = (<call>)  then compare String()/JSON with expect.
 * ==========================================================================*/
"use strict";
const vm = require("node:vm");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(input || "{}");
  } catch (e) {
    process.stdout.write(JSON.stringify({ pass: false, error: "bad-json" }) + "\n");
    return;
  }
  const code = String(payload.code || "");
  const tests = Array.isArray(payload.tests) ? payload.tests : [];
  if (!tests.length) {
    process.stdout.write(JSON.stringify({ pass: false, error: "no-tests" }) + "\n");
    return;
  }
  const results = [];
  let pass = true;
  for (const t of tests) {
    const context = vm.createContext({
      console: { log() {}, info() {}, warn() {}, error() {} },
      __result: undefined,
    });
    let got, error = null;
    try {
      const script = new vm.Script(code + "\n;globalThis.__result = (" + String(t.call) + ");", { filename: "learner.js" });
      script.runInContext(context, { timeout: 1000 });
      got = context.__result;
    } catch (e) {
      error = String((e && e.message) || e).slice(0, 200);
    }
    const rendered = typeof got === "object" && got !== null ? JSON.stringify(got) : String(got);
    const ok = error === null && rendered === String(t.expect);
    if (!ok) pass = false;
    results.push({ call: String(t.call), pass: ok, error });
  }
  process.stdout.write(JSON.stringify({ pass, results }) + "\n");
});
