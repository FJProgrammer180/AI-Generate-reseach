#!/usr/bin/env node
/* Tests app/services/code-runner.js directly (the server grader CodeRunner
 * invokes). Native PHP + Node.js deployments run this same file via
 * proc_open; PHP-WASM cannot spawn processes, so here we verify the
 * grader's contract in Node and verify in run.php that PHP REFUSES to
 * award unverified code points when the runner is unavailable.          */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const runner = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../app/services/code-runner.js");

function grade(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [runner], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.on("error", reject);
    child.on("close", () => {
      try { resolve(JSON.parse(out.trim().split("\n").pop())); }
      catch (e) { reject(new Error("unparseable grader output: " + out)); }
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

// The real CODE-001 test table from the exported catalog.
import fs from "node:fs";
const catalog = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../app/data/challenges.json"), "utf8"));
const code001 = catalog.challenges.find((c) => c.id === "CODE-001");
const code002 = catalog.challenges.find((c) => c.id === "CODE-002");

let pass = 0, fail = 0;
const check = (name, ok) => { console.log((ok ? "  PASS  " : "  FAIL  ") + name); ok ? pass++ : fail++; };

check("catalog contains CODE-001/002 test tables", !!code001 && !!code002 && code001.answer.tests.length === 5);

let r = await grade({ code: "function sumEven(a){return a.filter(x=>x%2===0).reduce((s,x)=>s+x,0);}", tests: code001.answer.tests });
check("correct sumEven passes all CODE-001 tests", r.pass === true);

r = await grade({ code: "function sumEven(a){return a.reduce((s,x)=>s+x,0);}", tests: code001.answer.tests });
check("wrong sumEven fails", r.pass === false);

r = await grade({ code: "function maxOf(a){return Math.max.apply(null,a);}", tests: code002.answer.tests });
check("correct maxOf passes all CODE-002 tests", r.pass === true);

r = await grade({ code: "function sumEven(a){ while(true){} }", tests: code001.answer.tests });
check("infinite loop is killed by the vm timeout and fails", r.pass === false);

r = await grade({ code: "function sumEven(a){ return require('fs').readFileSync('/etc/passwd','utf8').length; }", tests: code001.answer.tests });
check("no require/filesystem inside the sandbox", r.pass === false);

r = await grade({ code: "function sumEven(a){ return process.exit(0); }", tests: code001.answer.tests });
check("no process object inside the sandbox", r.pass === false);

console.log(`\nTOTAL: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
