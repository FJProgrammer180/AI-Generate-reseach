#!/usr/bin/env node
/* ============================================================================
 * check-academy-parity.js - prove CyberLab contains the Academy system
 * ----------------------------------------------------------------------------
 * CyberLab's workstation is intentionally the CTF Analyst Academy runtime
 * copied into cyberlab/public/assets, with only CyberLab's auth/bridge files
 * added. This check fails if:
 *
 *   - an Academy CSS/JS/data file is missing from CyberLab;
 *   - a copied file differs by even one byte from the Academy source;
 *   - an unexpected extra runtime asset appears in CyberLab;
 *   - cyberlab/public/index.php no longer loads the Academy styles/scripts
 *     in the Academy's exact order (CyberLab may append its auth CSS and
 *     server bridge, but may not fork or reorder the Academy stack).
 *
 * Run after changing either side:
 *   node cyberlab/tools/check-academy-parity.js
 * Then refresh the copies/catalogue when needed:
 *   php cyberlab/bin/sync-assets.php
 *   node cyberlab/tools/export-catalog.js
 * ==========================================================================*/
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CYBERLAB = path.join(__dirname, "..");
const REPO = path.join(CYBERLAB, "..");
const ACADEMY_ASSETS = path.join(REPO, "ctf-analyst-academy", "assets");
const CYBERLAB_ASSETS = path.join(CYBERLAB, "public", "assets");
const ACADEMY_SHELL = path.join(REPO, "ctf-analyst-academy", "index.html");
const CYBERLAB_SHELL = path.join(CYBERLAB, "public", "index.php");

const CYBERLAB_ONLY = new Set([
  "css/auth.css",
  "js/auth.js",
  "js/server-bridge.js",
]);

function listFiles(root, relative = "") {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(root, rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out.sort();
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function refs(shell, pattern) {
  return [...fs.readFileSync(shell, "utf8").matchAll(pattern)].map((m) => m[1]);
}

function sameArray(a, b) {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

const problems = [];

for (const required of [ACADEMY_ASSETS, CYBERLAB_ASSETS, ACADEMY_SHELL, CYBERLAB_SHELL]) {
  if (!fs.existsSync(required)) problems.push(`missing required path: ${path.relative(REPO, required)}`);
}

let academyFiles = [];
let cyberlabFiles = [];
if (!problems.length) {
  academyFiles = listFiles(ACADEMY_ASSETS);
  cyberlabFiles = listFiles(CYBERLAB_ASSETS);
  const cyberlabSet = new Set(cyberlabFiles);

  for (const rel of academyFiles) {
    const source = path.join(ACADEMY_ASSETS, rel);
    const copy = path.join(CYBERLAB_ASSETS, rel);
    if (!cyberlabSet.has(rel)) {
      problems.push(`missing CyberLab copy: assets/${rel}`);
    } else if (sha256(source) !== sha256(copy)) {
      problems.push(`CyberLab copy differs from Academy source: assets/${rel}`);
    }
  }

  for (const rel of CYBERLAB_ONLY) {
    if (!cyberlabSet.has(rel)) problems.push(`missing CyberLab-only asset: assets/${rel}`);
  }

  for (const rel of cyberlabFiles) {
    if (!academyFiles.includes(rel) && !CYBERLAB_ONLY.has(rel)) {
      problems.push(`unexpected extra CyberLab runtime asset: assets/${rel}`);
    }
  }

  const academyStyles = refs(ACADEMY_SHELL, /<link rel="stylesheet" href="([^"]+)">/g);
  const cyberlabStyles = refs(CYBERLAB_SHELL, /<link rel="stylesheet" href="([^"]+)">/g)
    .filter((rel) => rel !== "assets/css/auth.css");
  if (!sameArray(cyberlabStyles, academyStyles)) {
    problems.push(`stylesheet order/content differs: CyberLab=${JSON.stringify(cyberlabStyles)} Academy=${JSON.stringify(academyStyles)}`);
  }

  const academyScripts = refs(ACADEMY_SHELL, /<script src="([^"]+)"><\/script>/g);
  const cyberlabScripts = refs(CYBERLAB_SHELL, /<script src="([^"]+)"><\/script>/g)
    .filter((rel) => rel !== "assets/js/server-bridge.js");
  if (!sameArray(cyberlabScripts, academyScripts)) {
    problems.push(`script order/content differs: CyberLab=${JSON.stringify(cyberlabScripts)} Academy=${JSON.stringify(academyScripts)}`);
  }
}

if (problems.length) {
  console.error("ACADEMY -> CYBERLAB PARITY FAILED:\n - " + problems.join("\n - "));
  process.exit(1);
}

const totalBytes = academyFiles.reduce(
  (sum, rel) => sum + fs.statSync(path.join(ACADEMY_ASSETS, rel)).size,
  0,
);
console.log(
  `Academy -> CyberLab parity OK: ${academyFiles.length} runtime files, ${totalBytes} bytes, ` +
  "byte-for-byte identical; shell asset order matches.",
);
