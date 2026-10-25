<?php
/* ============================================================================
 * 404.php - friendly CyberLab not-found page.
 * ----------------------------------------------------------------------------
 * Used by Apache's ErrorDocument, the PHP built-in-server router, and the
 * WASM preview proxy. It intentionally does not require a database/session:
 * a missing route should still render correctly even during local setup.
 * Unknown API routes receive JSON instead of an HTML page.
 * ==========================================================================*/
declare(strict_types=1);
require dirname(__DIR__) . '/app/bootstrap.php';

// Apache ErrorDocument exposes the original path as REDIRECT_URL. The
// WASM preview proxy does the same job with an internal header because it
// has to issue a second request for this page after PHP returns its bare 404.
$requestUri = (string)(
    $_SERVER['HTTP_X_CYBERLAB_ORIGINAL_PATH']
    ?? $_SERVER['REDIRECT_URL']
    ?? $_SERVER['REQUEST_URI']
    ?? '/404.php'
);
$requestPath = (string)(parse_url($requestUri, PHP_URL_PATH) ?: '/404.php');

if (str_contains($requestPath, '/api/')) {
    json_out([
        'ok' => false,
        'error' => 'not_found',
        'message' => 'Endpoint tidak ditemukan.',
    ], 404);
}

$scriptName = str_replace('\\', '/', (string)($_SERVER['SCRIPT_NAME'] ?? '/404.php'));
$basePath = rtrim(dirname($scriptName), '/');
if ($basePath === '.' || $basePath === '\\') {
    $basePath = '';
}
$homeUrl = $basePath . '/index.php';
$loginUrl = $basePath . '/login.php';
$registerUrl = $basePath . '/register.php';
$faviconUrl = $basePath . '/favicon.svg';

http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>404 — Halaman tidak ditemukan — CyberLab V4</title>
<link rel="icon" href="<?= e($faviconUrl) ?>" type="image/svg+xml">
<link rel="shortcut icon" href="<?= e($basePath . '/favicon.ico') ?>">
<style>
  :root {
    color-scheme: dark;
    --bg: #0b0f14; --panel: #111823; --panel-2: #16202c;
    --line: #22303f; --line-2: #2d3f52;
    --text: #d6e2ee; --dim: #8ea3b8; --faint: #5f7488;
    --accent: #5ad1a5; --accent-2: #63b3ed; --bad: #e05c7a;
    --mono: "SFMono-Regular", Menlo, Consolas, "DejaVu Sans Mono", monospace;
    --sans: "Segoe UI", "Helvetica Neue", Arial, system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; background:
      radial-gradient(circle at 15% -10%, rgba(90,209,165,.10), transparent 42%),
      radial-gradient(circle at 90% 0%, rgba(99,179,237,.09), transparent 38%),
      var(--bg);
    color: var(--text); font-family: var(--sans); line-height: 1.55;
  }
  header {
    display: flex; align-items: center; gap: .7rem;
    padding: .7rem 1.1rem; border-bottom: 1px solid var(--line);
    background: rgba(11,15,20,.94);
  }
  .mark {
    background: linear-gradient(140deg, var(--accent), var(--accent-2));
    color: #06121a; font-weight: 800; letter-spacing: .06em;
    padding: .35rem .5rem; border-radius: 6px; font-family: var(--mono); font-size: .9rem;
  }
  .brand { font-weight: 800; letter-spacing: .14em; font-size: .92rem; }
  .sub { color: var(--faint); font-family: var(--mono); font-size: .7rem; letter-spacing: .05em; }
  main { width: min(680px, calc(100% - 2rem)); margin: 12vh auto 3rem; }
  .card {
    background: linear-gradient(180deg, var(--panel-2), var(--panel));
    border: 1px solid var(--line-2); border-radius: 14px;
    padding: clamp(1.25rem, 4vw, 2rem);
    box-shadow: 0 24px 70px rgba(0,0,0,.32);
  }
  .code { color: var(--bad); font-family: var(--mono); font-size: .8rem; letter-spacing: .18em; }
  h1 { margin: .35rem 0 .5rem; font-size: clamp(1.55rem, 5vw, 2.35rem); line-height: 1.12; }
  p { color: var(--dim); margin: .55rem 0; }
  .path {
    margin: 1rem 0; padding: .7rem .85rem; overflow-wrap: anywhere;
    border: 1px solid var(--line); border-radius: 8px; background: #0d141c;
    color: var(--text); font-family: var(--mono); font-size: .82rem;
  }
  .actions { display: flex; flex-wrap: wrap; gap: .6rem; margin-top: 1.25rem; }
  a.btn {
    display: inline-flex; align-items: center; min-height: 40px;
    padding: .55rem .85rem; border-radius: 7px; border: 1px solid var(--line-2);
    color: var(--text); text-decoration: none; font-weight: 700; font-size: .86rem;
  }
  a.btn.primary { background: var(--accent); border-color: var(--accent); color: #06121a; }
  a.btn:hover, a.btn:focus-visible { border-color: var(--accent); outline: none; }
  .hint { color: var(--faint); font-size: .84rem; }
</style>
</head>
<body>
<header>
  <div class="mark">CTF//</div>
  <div>
    <div class="brand">CYBERLAB V4</div>
    <div class="sub">analyst workstation - akun terverifikasi server</div>
  </div>
</header>
<main>
  <section class="card" aria-labelledby="not-found-title">
    <div class="code">ERROR 404</div>
    <h1 id="not-found-title">Halaman tidak ditemukan</h1>
    <p>Alamat yang kamu buka tidak tersedia di CyberLab. Mungkin tautannya sudah berubah, salah ketik, atau halamannya memang tidak pernah ada.</p>
    <div class="path" aria-label="Alamat yang diminta"><?= e($requestPath) ?></div>
    <p class="hint">Tidak ada data akun atau progres yang hilang karena error ini. Gunakan salah satu jalan pintas berikut:</p>
    <nav class="actions" aria-label="Jalan pintas">
      <a class="btn primary" href="<?= e($homeUrl) ?>">Buka workstation</a>
      <a class="btn" href="<?= e($loginUrl) ?>">Masuk</a>
      <a class="btn" href="<?= e($registerUrl) ?>">Daftar akun</a>
    </nav>
  </section>
</main>
</body>
</html>
