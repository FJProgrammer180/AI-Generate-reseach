/* ============================================================================
 * lib.mjs - shared bootstrap for the PHP-WASM harness.
 * Creates a PHP 8.3 (WASM) instance, copies the cyberlab/ tree into its
 * virtual filesystem at /cyberlab, writes a SQLite .env, and applies
 * database/schema.sqlite.sql. The copied tree already contains the Academy
 * runtime under cyberlab/public/assets, so this harness intentionally has
 * no dependency on the sibling ctf-analyst-academy/ folder. The PHP code
 * under test is byte-identical to production; only DB_DRIVER differs.
 * ==========================================================================*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PHP } from "@php-wasm/universal";
import { loadNodeRuntime } from "@php-wasm/node";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CYBERLAB_DIR = path.resolve(HERE, "..", "..");

let processIdCounter = 10;

export async function makePhp() {
  const php = new PHP(await loadNodeRuntime("8.3", {
    emscriptenOptions: { processId: processIdCounter++ },
  }));
  return php;
}

function copyTree(php, hostDir, vfsDir, skip = new Set()) {
  php.mkdirTree(vfsDir);
  for (const entry of fs.readdirSync(hostDir, { withFileTypes: true })) {
    const hostPath = path.join(hostDir, entry.name);
    const vfsPath = vfsDir + "/" + entry.name;
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      copyTree(php, hostPath, vfsPath, skip);
    } else if (entry.isFile()) {
      if (skip.has(vfsPath)) continue;
      php.writeFile(vfsPath, fs.readFileSync(hostPath));
    }
  }
}

/** Copy the complete, self-contained CyberLab tree into the VFS. */
export function populateVfs(php) {
  copyTree(php, CYBERLAB_DIR, "/cyberlab");
  php.mkdirTree("/cyberlab/storage");
  php.writeFile("/cyberlab/.env", [
    "DB_DRIVER=sqlite",
    "DB_SQLITE_PATH=storage/wasm.sqlite3",
    "SESSION_SECURE=0",
    "",
  ].join("\n"));
}

/** Apply the SQLite schema through the app's own Database factory. */
export async function migrate(php) {
  const out = await php.run({
    code: `<?php
      require '/cyberlab/app/bootstrap.php';
      $pdo = Database::connect();
      $sql = (string) file_get_contents(CYBERLAB_ROOT . '/database/schema.sqlite.sql');
      $sql = preg_replace('/^--.*$/m', '', $sql) ?? $sql;
      foreach (array_filter(array_map('trim', explode(';', $sql))) as $stmt) { $pdo->exec($stmt); }
      $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")->fetchAll(PDO::FETCH_COLUMN);
      echo 'tables: ' . implode(',', $tables);
    `,
  });
  if (out.exitCode !== 0 || !out.text.includes("tables:")) {
    throw new Error("migration failed: " + out.text + " " + String(out.errors || ""));
  }
  return out.text.trim();
}
