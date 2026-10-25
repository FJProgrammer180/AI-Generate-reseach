#!/usr/bin/env node
/* ============================================================================
 * serve.mjs - LIVE PREVIEW server for environments without native PHP.
 * ----------------------------------------------------------------------------
 * NOT the production server. It runs the real CyberLab PHP pages on
 * PHP-WASM (PHP 8.3) with an in-memory SQLite database file, behind a tiny
 * Node http proxy, so the full register/login/workstation flow can be
 * clicked end-to-end in a browser. Accounts live as long as this process.
 * Production: `php -S` or Apache/Nginx + MySQL (see ../../README.md).
 *
 *   node serve.mjs [--port 8080]
 * Optional demo admin (opt-in, never a committed credential):
 *   CYBERLAB_SEED_ADMIN=1 CYBERLAB_SEED_ADMIN_PASSWORD='...' node serve.mjs
 * ==========================================================================*/
import http from "node:http";
import { PHPRequestHandler } from "@php-wasm/universal";
import { makePhp, populateVfs, migrate } from "./lib.mjs";

const portFlag = process.argv.indexOf("--port");
const PORT = portFlag >= 0 ? Number(process.argv[portFlag + 1]) : 8080;

// Match bin/serve-router.php + public/.htaccess in the browser preview:
// friendly extensionless URLs use the canonical PHP entry points.
const PAGE_ALIASES = new Map([
  ["/index", "/index.php"],
  ["/index.html", "/index.php"],
  ["/login", "/login.php"],
  ["/login/", "/login.php"],
  ["/register", "/register.php"],
  ["/register/", "/register.php"],
  ["/profile", "/profile.php"],
  ["/profile/", "/profile.php"],
  ["/admin", "/admin.php"],
  ["/admin/", "/admin.php"],
  ["/logout", "/logout.php"],
  ["/logout/", "/logout.php"],
]);

const php = await makePhp();
populateVfs(php, { withAssets: true });
console.log(await migrate(php));

if (process.env.CYBERLAB_SEED_ADMIN === "1") {
  const pw = process.env.CYBERLAB_SEED_ADMIN_PASSWORD || "";
  const out = await php.run({
    code: `<?php
      require '/cyberlab/app/bootstrap.php';
      $pw = ${JSON.stringify(pw)};
      if (strlen($pw) < 10) { echo 'seed admin SKIPPED (password too short)'; exit; }
      $users = new UserRepository(Database::connect());
      if ($users->countAdmins() === 0) {
        $pdo = Database::connect();
        $pdo->beginTransaction();
        $id = $users->createAccount('admin', 'admin@example.com', password_hash($pw, PASSWORD_DEFAULT), 'admin');
        $users->createCompanionRows($id, 'Administrator Lab');
        $pdo->commit();
        echo 'seed admin created: admin';
      } else { echo 'seed admin SKIPPED (admin exists)'; }
    `,
  });
  console.log(out.text.trim());
}

const handler = new PHPRequestHandler({
  php,
  documentRoot: "/cyberlab/public",
  absoluteUrl: `http://0.0.0.0:${PORT}`,
  cookieStore: false, // the real browser owns cookies; we forward them verbatim
});

const server = http.createServer(async (req, res) => {
  try {
    const method = req.method || "GET";
    let url;
    try {
      url = new URL(req.url || "/", "http://preview.local");
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Bad Request");
      return;
    }

    const collapsedPath = url.pathname.replace(/\/{2,}/g, "/");
    const aliasTarget = PAGE_ALIASES.get(collapsedPath);
    if ((method === "GET" || method === "HEAD") && (collapsedPath !== url.pathname || aliasTarget)) {
      const location = (aliasTarget || collapsedPath) + url.search;
      res.writeHead(302, { Location: location, "Cache-Control": "no-store" });
      res.end();
      return;
    }
    if (aliasTarget) url.pathname = aliasTarget;
    else url.pathname = collapsedPath;

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const headers = {};
    for (const name of ["cookie", "content-type", "x-csrf-token", "accept"]) {
      if (req.headers[name]) headers[name] = req.headers[name];
    }
    let out = await handler.request({
      url: url.pathname + url.search,
      method,
      headers,
      body: body.length ? new Uint8Array(body) : undefined,
    });
    let status = out.httpStatusCode;

    if (status === 404 && url.pathname.startsWith("/api/")) {
      res.writeHead(404, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify({ ok: false, error: "not_found", message: "Endpoint tidak ditemukan." }));
      return;
    }
    if (status === 404 && url.pathname !== "/404.php") {
      try {
        out = await handler.request({
          url: "/404.php",
          method: "GET",
          headers: { ...headers, "x-cyberlab-original-path": url.pathname + url.search },
        });
        status = 404;
      } catch {
        // Keep PHPRequestHandler's plain 404 if the branded page cannot run.
      }
    }

    const flat = {};
    for (const [k, v] of Object.entries(out.headers)) flat[k] = Array.isArray(v) ? v : [v];
    res.writeHead(status, flat);
    res.end(Buffer.from(out.bytes));
  } catch (err) {
    console.error("request failed:", err);
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("CyberLab preview error: " + String((err && err.message) || err));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`CyberLab V4 preview (PHP-WASM + SQLite) listening on http://0.0.0.0:${PORT}/`);
  console.log("Register a real account from the login page - the database is this process's memory.");
});
