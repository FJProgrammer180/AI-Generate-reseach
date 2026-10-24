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
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const headers = {};
    for (const name of ["cookie", "content-type", "x-csrf-token", "accept"]) {
      if (req.headers[name]) headers[name] = req.headers[name];
    }
    const out = await handler.request({
      url: req.url || "/",
      method: req.method || "GET",
      headers,
      body: body.length ? new Uint8Array(body) : undefined,
    });
    const flat = {};
    for (const [k, v] of Object.entries(out.headers)) flat[k] = Array.isArray(v) ? v : [v];
    res.writeHead(out.httpStatusCode, flat);
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
