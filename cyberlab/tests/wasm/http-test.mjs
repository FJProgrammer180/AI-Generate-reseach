#!/usr/bin/env node
/* ============================================================================
 * http-test.mjs - full request-cycle tests through PHPRequestHandler.
 * Real PHP pages, real sessions/cookies, real PDO(SQLite) database:
 * protected-route redirects, registration, CSRF, login + session
 * regeneration, workstation hydration, submit/migrate APIs, admin 403,
 * logout, and two-client data isolation.
 * ==========================================================================*/
import { PHPRequestHandler, HttpCookieStore } from "@php-wasm/universal";
import { makePhp, populateVfs, migrate } from "./lib.mjs";

const php = await makePhp();
populateVfs(php, { withAssets: true });
await migrate(php);

function makeClient() {
  return new PHPRequestHandler({
    php,
    documentRoot: "/cyberlab/public",
    absoluteUrl: "http://cyberlab.test",
    cookieStore: new HttpCookieStore(),
  });
}
const A = makeClient();
const B = makeClient();

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail = "") {
  console.log((ok ? "  PASS  " : "  FAIL  ") + name + (ok || !detail ? "" : "  [" + detail + "]"));
  if (ok) pass++; else { fail++; failures.push(name); }
}
const loc = (res) => (res.headers["location"] || [""])[0];
const setCookies = (res) => (res.headers["set-cookie"] || []).join("\n");
function csrfFromHtml(html) {
  const m = html.match(/name="csrf_token" value="([a-f0-9]{32,})"/) || html.match(/"csrf"\s*:\s*"([a-f0-9]{32,})"/);
  return m ? m[1] : null;
}
function sessionIdFrom(cookieBlob) {
  const m = cookieBlob.match(/CYBERLABSESSID=([^;]+)/);
  return m ? m[1] : null;
}

console.log("== protected routes & unauthenticated API ==");
let res = await A.request({ url: "/index.php" });
check("GET /index.php anonymous -> 302 to login", res.httpStatusCode === 302 && loc(res).includes("login.php"),
  "status=" + res.httpStatusCode + " loc=" + loc(res));
const anonCookie = setCookies(res);
check("session cookie issued HttpOnly", /CYBERLABSESSID=/.test(anonCookie) && /HttpOnly/i.test(anonCookie), anonCookie.split("\n")[0] || "none");
check("session cookie SameSite=Lax", /SameSite=Lax/i.test(anonCookie));
const anonSid = sessionIdFrom(anonCookie);

res = await A.request({ url: "/profile.php" });
check("GET /profile.php anonymous -> 302 to login", res.httpStatusCode === 302 && loc(res).includes("login.php"));
res = await A.request({ url: "/admin.php" });
check("GET /admin.php anonymous -> 302 to login", res.httpStatusCode === 302 && loc(res).includes("login.php"));
res = await A.request({ url: "/api/progress.php" });
check("GET /api/progress.php anonymous -> 401 JSON", res.httpStatusCode === 401 && res.json && res.json.ok === false);
res = await A.request({ method: "POST", url: "/api/submit.php", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId: "CRYPTO-013", answer: "x" }) });
check("POST /api/submit.php anonymous -> 401 JSON", res.httpStatusCode === 401);

console.log("\n== registration over HTTP (real insert) ==");
res = await A.request({ url: "/register.php" });
check("GET /register.php 200 + CSRF field", res.httpStatusCode === 200 && !!csrfFromHtml(res.text));
let csrf = csrfFromHtml(res.text);

res = await A.request({
  method: "POST", url: "/register.php",
  body: { username: "fajri", email: "fajri@example.com", password: "Secret12345", password_confirm: "Secret12345", terms: "1", csrf_token: "invalid-token" },
});
check("registration with bad CSRF refused (no redirect to login)", !(res.httpStatusCode === 302 && loc(res).includes("login.php")));

res = await A.request({ url: "/register.php" });
csrf = csrfFromHtml(res.text);
res = await A.request({
  method: "POST", url: "/register.php",
  body: { username: "fajri", email: "fajri@example.com", password: "Secret12345", password_confirm: "Secret12345", terms: "1", csrf_token: csrf },
});
check("valid registration -> 302 to login", res.httpStatusCode === 302 && loc(res).includes("login.php"), "status=" + res.httpStatusCode);

res = await A.request({ url: "/register.php" });
csrf = csrfFromHtml(res.text);
res = await A.request({
  method: "POST", url: "/register.php",
  body: { username: "fajri", email: "lain@example.com", password: "Secret12345", password_confirm: "Secret12345", terms: "1", csrf_token: csrf },
});
check("duplicate username over HTTP rejected with feedback", res.httpStatusCode === 200 && res.text.includes("sudah digunakan"));

console.log("\n== login over HTTP ==");
res = await A.request({ url: "/login.php" });
csrf = csrfFromHtml(res.text);
res = await A.request({
  method: "POST", url: "/login.php",
  body: { identifier: "fajri", password: "WrongPass123", csrf_token: csrf },
});
check("wrong password -> generic error page", res.httpStatusCode === 200 && res.text.includes("tidak valid"));
res = await A.request({ url: "/index.php" });
check("still anonymous after failed login", res.httpStatusCode === 302);

res = await A.request({ url: "/login.php" });
csrf = csrfFromHtml(res.text);
res = await A.request({
  method: "POST", url: "/login.php",
  body: { identifier: "fajri@example.com", password: "Secret12345", csrf_token: csrf },
});
check("correct login -> 302 to workstation", res.httpStatusCode === 302 && loc(res).includes("index.php"), "loc=" + loc(res));
const authedSid = sessionIdFrom(setCookies(res));
check("session id regenerated at login (fixation defence)", !!anonSid && !!authedSid && authedSid !== anonSid,
  "anon=" + anonSid + " authed=" + authedSid);

console.log("\n== workstation & progress API ==");
res = await A.request({ url: "/index.php" });
check("workstation 200 for the account", res.httpStatusCode === 200 && res.text.includes("@fajri") && res.text.includes("window.CYBERLAB"));
const bridgeCsrf = csrfFromHtml(res.text);
check("bridge CSRF token present", !!bridgeCsrf);

res = await A.request({ url: "/assets/css/style.css" });
check("existing stylesheet served", res.httpStatusCode === 200 && res.text.includes("--accent"));
res = await A.request({ url: "/assets/js/challenges.js" });
check("existing engine served", res.httpStatusCode === 200 && res.text.includes("CTF.DIFFICULTIES"));
res = await A.request({ url: "/assets/js/server-bridge.js" });
check("server bridge served", res.httpStatusCode === 200 && res.text.includes("CYBERLAB"));
res = await A.request({ url: "/assets/js/data/challenges-crypto.js" });
check("challenge dataset served", res.httpStatusCode === 200 && res.text.includes("CRYPTO-001"));

res = await A.request({ url: "/api/progress.php" });
check("progress starts at zero in the database",
  res.httpStatusCode === 200 && res.json.ok === true && res.json.state.progress.totalPoints === 0 && res.json.account.username === "fajri");
check("progress payload never contains a password hash", !res.text.includes("password_hash") && !res.text.includes("$2y$"));

console.log("\n== submit API: server-validated flags ==");
const submit = (client, payload, token) => client.request({
  method: "POST", url: "/api/submit.php",
  headers: { "Content-Type": "application/json", ...(token ? { "X-CSRF-Token": token } : {}) },
  body: JSON.stringify(payload),
});

res = await submit(A, { challengeId: "CRYPTO-013", answer: "FLAG{SHIFT_BY_THREE}", hintsUsed: 0 }, null);
check("submit without CSRF token -> 403", res.httpStatusCode === 403);
res = await submit(A, { challengeId: "CRYPTO-013", answer: "FLAG{NOPE}", hintsUsed: 0 }, bridgeCsrf);
check("wrong flag -> incorrect, server attempt count 1", res.json && res.json.status === "incorrect" && res.json.attemptCount === 1);
// The forged xp/points fields below must be ignored end-to-end.
res = await submit(A, { challengeId: "CRYPTO-013", answer: "FLAG{SHIFT_BY_THREE}", hintsUsed: 0, xp: 999999, points: 888888, user_id: 1, totalXp: 777777 }, bridgeCsrf);
check("correct flag -> solved with server award (+50 PTS)",
  res.json && res.json.status === "solved" && res.json.award.points === 50 && res.json.progress.totalPoints === 50,
  JSON.stringify(res.json || {}).slice(0, 200));
res = await submit(A, { challengeId: "CRYPTO-013", answer: "FLAG{SHIFT_BY_THREE}", hintsUsed: 0 }, bridgeCsrf);
check("repeat submit -> already_solved, totals unchanged",
  res.json && res.json.status === "already_solved" && res.json.progress.totalPoints === 50);
res = await submit(A, { challengeId: "TIDAK-ADA", answer: "x", hintsUsed: 0 }, bridgeCsrf);
check("unknown challenge id -> 422", res.httpStatusCode === 422);

console.log("\n== migrate API: forged totals ignored ==");
res = await A.request({
  method: "POST", url: "/api/migrate.php",
  headers: { "Content-Type": "application/json", "X-CSRF-Token": bridgeCsrf },
  body: JSON.stringify({ items: [
    { challengeId: "ENCODE-001", hintsUsed: 0, attempts: 1, solvedAt: "2025-02-01T08:00:00", xp: 999999, points: 999999 },
    { challengeId: "FORGED-001", hintsUsed: 0, attempts: 1, solvedAt: "2025-02-01T08:00:00" },
  ] }),
});
// ENCODE-001: Easy 100 pts / 100 XP base; not a first solve (CRYPTO-013 already in DB),
// perfect + no-hint bonuses apply: 100+25+100 = 225 XP. Totals: 50+100 pts, 125+225... xp from
// CRYPTO-013 solve above was 50 base + 50 first + 25 nohint = 125 (attempt 2 => not perfect).
check("migration imports only the real id", res.json && res.json.ok === true && res.json.imported.length === 1 && res.json.imported[0] === "ENCODE-001",
  JSON.stringify(res.json || {}).slice(0, 200));
check("migration totals are server-recomputed (150 PTS)",
  res.json && res.json.progress.totalPoints === 150, JSON.stringify(res.json.progress || {}));

res = await A.request({ url: "/api/progress.php" });
check("progress now reflects both solves from the database",
  res.json.state.progress.totalPoints === 150 && res.json.state.progress.challengesSolved === 2
  && res.json.state.submissions.filter((s) => s.status === "solved").length === 2);

console.log("\n== profile & admin authorization ==");
res = await A.request({ url: "/profile.php" });
check("profile shows database stats", res.httpStatusCode === 200 && res.text.includes("STATISTIK CTF SAYA") && res.text.includes("fajri@example.com"));
res = await A.request({ url: "/admin.php" });
check("non-admin gets 403 on admin panel", res.httpStatusCode === 403);

console.log("\n== second client: isolation over HTTP ==");
res = await B.request({ url: "/register.php" });
let csrfB = csrfFromHtml(res.text);
res = await B.request({
  method: "POST", url: "/register.php",
  body: { username: "sari", email: "sari@example.com", password: "Secret12345", password_confirm: "Secret12345", terms: "1", csrf_token: csrfB },
});
res = await B.request({ url: "/login.php" });
csrfB = csrfFromHtml(res.text);
res = await B.request({ method: "POST", url: "/login.php", body: { identifier: "sari", password: "Secret12345", csrf_token: csrfB } });
res = await B.request({ url: "/api/progress.php" });
check("second account starts empty despite first account solves",
  res.json && res.json.state.progress.totalPoints === 0 && res.json.state.submissions.length === 0 && res.json.account.username === "sari");

console.log("\n== logout over HTTP ==");
res = await B.request({ url: "/index.php" });
const logoutCsrf = csrfFromHtml(res.text);
res = await B.request({ method: "POST", url: "/logout.php", body: { csrf_token: logoutCsrf } });
check("logout -> 302 to login", res.httpStatusCode === 302 && loc(res).includes("login.php"));
res = await B.request({ url: "/index.php" });
check("workstation protected again after logout (session destroyed server-side)",
  res.httpStatusCode === 302 && loc(res).includes("login.php"));
res = await B.request({ url: "/api/progress.php" });
check("API 401 after logout", res.httpStatusCode === 401);

console.log(`\nTOTAL: ${pass} passed, ${fail} failed`);
if (fail) console.log("FAILED: " + failures.join("; "));
process.exit(fail ? 1 : 0);
