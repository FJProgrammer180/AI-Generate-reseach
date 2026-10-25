#!/usr/bin/env node
/* Runs tests/run.php on PHP-WASM (PHP 8.3, in-memory SQLite per group).
 * This executes the REAL CyberLab PHP services (auth, scoring, PDO).     */
import { makePhp, populateVfs } from "./lib.mjs";

const php = await makePhp();
populateVfs(php);

const out = await php.run({ scriptPath: "/cyberlab/tests/run.php" });
process.stdout.write(out.text);
if (out.errors) process.stderr.write(String(out.errors) + "\n");
process.exit(out.exitCode === 0 && out.text.includes("0 failed") ? 0 : 1);
