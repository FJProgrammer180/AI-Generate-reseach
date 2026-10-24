#!/usr/bin/env node
/*
 * check-deploy.js - guards the Netlify deployment configuration.
 *
 * The 404 that prompted this script: Netlify was publishing the repository
 * root, which has no index.html, so `/` returned Netlify's own "Page not found"
 * screen. This check fails loudly if that class of mistake comes back.
 *
 * Usage: node tools/check-deploy.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const HERE = __dirname;
const SITE = path.resolve(HERE, "..");
const REPO = path.resolve(SITE, "..");

let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? "PASS  " : "FAIL  ") + name + (detail !== undefined ? "  -> " + detail : ""));
  if (!ok) failures++;
}

/* ---- minimal TOML reader: enough for [build] / publish / base keys ---- */
function readToml(file) {
  if (!fs.existsSync(file)) return null;
  const out = { sections: {}, values: {} };
  let section = "";
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line) => {
    const l = line.replace(/#.*$/, "").trim();
    if (!l) return;
    let m = l.match(/^\[([^\]]+)\]$/);
    if (m) {
      section = m[1].trim();
      if (["[[headers]]", "[[redirects]]"].some((x) => l.startsWith(x))) section = "__list__";
      out.sections[section] = out.sections[section] || {};
      return;
    }
    m = l.match(/^([A-Za-z0-9_.-]+)\s*=\s*"([^"]*)"$/);
    if (m) out.sections[section] = out.sections[section] || {}, (out.sections[section][m[1]] = m[2]);
  });
  return out;
}

/* ---- 1. the repo root must not be the publish root ------------------- */
const rootToml = readToml(path.join(REPO, "netlify.toml"));
check("repository-root netlify.toml exists", !!rootToml, path.join(REPO, "netlify.toml"));

const build = (rootToml && rootToml.sections.build) || {};
const publish = (build.publish || "").replace(/^\.\//, "").replace(/\/$/, "");
check("build.publish is set", !!publish, publish || "unset");
check("build.publish is not the repository root", publish !== "" && publish !== ".", JSON.stringify(publish));

const publishDir = publish ? path.resolve(REPO, publish) : null;
check("build.publish exists on disk", !!publishDir && fs.existsSync(publishDir) && fs.statSync(publishDir).isDirectory(),
  publishDir && fs.existsSync(publishDir) ? "ok" : (publishDir || "n/a"));

/* ---- 2. that directory must contain the real entry point ------------- */
const entry = publishDir && path.join(publishDir, "index.html");
check("published index.html exists", !!entry && fs.existsSync(entry), entry || "n/a");
if (entry && fs.existsSync(entry)) {
  const html = fs.readFileSync(entry, "utf8");
  check("index.html is the real app shell (not a placeholder)", /<title>[^<]*CTF Analyst Academy/i.test(html) && /assets\/js\/app\.js/.test(html),
    (html.match(/<title>([^<]*)<\/title>/i) || [, "no title"])[1]);

  /* ---- 3. every referenced local asset resolves, case-sensitively --- */
  const refs = [];
  html.replace(/(?:src|href)="([^"]+)"/g, (_, r) => { refs.push(r); return _; });
  const missing = [];
  refs.forEach((r) => {
    if (/^(https?:)?\/\//.test(r) || r.startsWith("#") || r.startsWith("data:")) return;
    const target = path.join(publishDir, r.split("?")[0]);
    // exact-case lookup, so a mismatch cannot pass on macOS/Windows
    const dir = path.dirname(target);
    const base = path.basename(target);
    const okCase = fs.existsSync(dir) && fs.readdirSync(dir).indexOf(base) !== -1;
    if (!okCase) missing.push(r);
  });
  check("all referenced assets exist with exact filename case", missing.length === 0,
    missing.length ? missing.join(", ") : refs.length + " refs");
  check("no external script/style references", !refs.some((r) => /^(https?:)?\/\//.test(r)),
    refs.filter((r) => /^(https?:)?\/\//.test(r)).join(", ") || "none");
}

/* ---- 4. a plain static site must not claim an SPA fallback ---------- */
const rootText = fs.existsSync(path.join(REPO, "netlify.toml")) ? fs.readFileSync(path.join(REPO, "netlify.toml"), "utf8") : "";
const liveFallback = /^\s*from\s*=\s*"\/\*"\s*$/m.test(rootText) && /^\s*to\s*=\s*"\/index\.html"\s*$/m.test(rootText);
check("no blanket /* -> /index.html rewrite (app has no path routing)", !liveFallback,
  liveFallback ? "SPA fallback found" : "none");

/* ---- 5. base-directory fallback config stays consistent ------------- */
const siteToml = readToml(path.join(SITE, "netlify.toml"));
if (siteToml) {
  const p2 = ((siteToml.sections.build || {}).publish || "").replace(/\/$/, "");
  check("site-level netlify.toml publishes this folder", p2 === "." , JSON.stringify(p2));
  check("site-level netlify.toml has no base override", !(siteToml.sections.build || {}).base, "none");
} else {
  check("site-level netlify.toml present (for base-directory deploys)", false, "missing");
}

/* ---- 6. no build system to misconfigure ----------------------------- */
check("no stale package.json at repo root (a 'npm run build' would fail)",
  !fs.existsSync(path.join(REPO, "package.json")), "none");

console.log("\n" + (failures === 0 ? "DEPLOY CONFIG OK ✓" : failures + " CHECK(S) FAILED ✗"));
process.exit(failures === 0 ? 0 : 1);
