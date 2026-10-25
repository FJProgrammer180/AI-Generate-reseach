<?php
/* ============================================================================
 * index.php - the protected CyberLab workstation.
 * ----------------------------------------------------------------------------
 * This is the existing CTF Analyst Academy interface (same index.html shell,
 * same assets, same tab animations) behind a real server-side login. The
 * page itself contains NO account numbers: window.CYBERLAB carries only the
 * public identity + a CSRF token; every statistic hydrates from
 * api/progress.php, and every solve posts to api/submit.php where the flag
 * is re-validated. assets/js/server-bridge.js does that wiring without forking
 * the original app code.
 * Static assets (assets/css/style.css, assets/js/*.js, assets/js/data/*.js)
 * are the academy's own files - served from here by sync (bin/sync-assets.php)
 * or by the dev router's alias. Nothing is duplicated in this repository.
 * ==========================================================================*/
declare(strict_types=1);
require dirname(__DIR__) . '/app/bootstrap.php';

$pdo = db();
$user = AuthGuard::requireAuth($pdo);
$users = new UserRepository($pdo);
$profile = $users->profile((int)$user['id']);
$settings = $users->settings((int)$user['id']);
$account = UserRepository::publicAccount($user, $profile);
$reducedMotion = (int)($settings['reduced_motion'] ?? 0) === 1;

header('Cache-Control: no-store'); // never cache the authenticated shell
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CyberLab V4 - workstation <?= e($account['displayName']) ?></title>
<meta name="description" content="CyberLab V4: workstation CTF &amp; keamanan siber dengan akun dan progres persisten di database.">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="shortcut icon" href="favicon.ico">
<link rel="stylesheet" href="assets/css/style.css">
<link rel="stylesheet" href="assets/css/auth.css">
<meta name="csrf-token" content="<?= e(Csrf::token()) ?>">
</head>
<body data-view="dashboard"<?= $reducedMotion ? ' class="reduced-motion"' : '' ?>>

<header class="topbar">
  <div class="brand" role="banner">
    <div class="brand-mark mono">CTF//</div>
    <div class="brand-text">
      <div class="brand-name">CYBERLAB V4</div>
      <div class="brand-sub mono">analyst academy - progres akun: database</div>
    </div>
  </div>

  <div class="hud" aria-live="polite">
    <div class="hud-item">
      <span class="hud-label">LEVEL</span>
      <span class="hud-value mono" id="hud-level">LEVEL 1</span>
      <div class="hud-bar"><div class="hud-bar-fill" id="hud-xp-bar" style="width:0%"></div></div>
      <span class="hud-sub mono" id="hud-rank">next level in 250 XP</span>
    </div>
    <div class="hud-item"><span class="hud-label">XP</span><span class="hud-value mono" id="hud-xp">0 XP</span></div>
    <div class="hud-item"><span class="hud-label">POINTS</span><span class="hud-value mono" id="hud-points">0 PTS</span></div>
    <div class="hud-item"><span class="hud-label">SOLVED</span><span class="hud-value mono" id="hud-solved">0</span></div>
    <div class="hud-item"><span class="hud-label">BADGES</span><span class="hud-value mono" id="hud-badges">0/22</span></div>
  </div>

  <div class="topbar-tools">
    <input id="global-search" class="input search" type="search" placeholder="search the database... (Enter)" aria-label="search challenges">
    <button id="nav-daily" class="btn tiny" type="button">DAILY</button>
    <button id="nav-random" class="btn tiny ghost" type="button">RANDOM</button>
    <a class="btn tiny ghost" href="profile.php" title="Profil akun">PROFIL</a>
    <?php if ($account['role'] === 'admin'): ?><a class="btn tiny ghost" href="admin.php" title="Panel administrator">ADMIN</a><?php endif; ?>
    <form method="post" action="logout.php" class="inline-form">
      <?= Csrf::field() ?>
      <button class="btn tiny danger" type="submit" title="Akhiri sesi server">KELUAR</button>
    </form>
  </div>
</header>

<nav class="nav" aria-label="main">
  <button class="nav-btn active" data-view="dashboard" type="button">DASHBOARD</button>
  <button class="nav-btn" data-view="challenges" type="button">CHALLENGES</button>
  <button class="nav-btn" data-view="campaigns" type="button">MYSTERY ARCHIVE</button>
  <button class="nav-btn" data-view="practice" type="button">PRACTICE</button>
  <button class="nav-btn" data-view="badges" type="button">BADGES</button>
  <button class="nav-btn" data-view="progress" type="button">PROGRESS</button>
  <button class="nav-btn" data-view="about" type="button">ABOUT</button>
</nav>

<main id="main">
  <div id="view" class="view"></div>
</main>

<div id="toast-zone" class="toast-zone" aria-live="assertive"></div>

<footer class="footer">
  <div class="footer-row">
    <span class="mono" id="footer-counts">database akun</span>
    <span class="mono" id="cl-sync-note">menghubungkan ke akun @<?= e($account['username']) ?>...</span>
  </div>
  <p class="footer-note">
    SAFETY: every host, person, company, hash, credential and flag in this lab is invented for training.
    The terminal, web labs, SQL lab and XSS sandbox are simulations. Progress you earn here is stored
    server-side on your CyberLab account (validated on the server) - signing out ends the server session.
  </p>
</footer>

<script>
window.CYBERLAB = <?= json_encode([
    'account' => $account,
    'csrf' => Csrf::token(),
    'api' => ['progress' => 'api/progress.php', 'submit' => 'api/submit.php', 'migrate' => 'api/migrate.php'],
    'reducedMotion' => $reducedMotion,
], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES) ?>;
</script>
<!-- engine (unchanged academy assets, same order as index.html) -->
<script src="assets/js/challenges.js"></script>
<script src="assets/js/artifacts.js"></script>
<script src="assets/js/data/vfs.js"></script>
<script src="assets/js/data/challenges-foundations.js"></script>
<script src="assets/js/data/challenges-crypto.js"></script>
<script src="assets/js/data/challenges-encoding.js"></script>
<script src="assets/js/data/challenges-stego.js"></script>
<script src="assets/js/data/challenges-forensics.js"></script>
<script src="assets/js/data/challenges-network.js"></script>
<script src="assets/js/data/challenges-linux.js"></script>
<script src="assets/js/data/challenges-web.js"></script>
<script src="assets/js/data/challenges-code.js"></script>
<script src="assets/js/data/challenges-re.js"></script>
<script src="assets/js/data/challenges-osint.js"></script>
<script src="assets/js/data/challenges-campaigns.js"></script>
<!-- app layer -->
<script src="assets/js/renderer.js"></script>
<script src="assets/js/weblab.js"></script>
<script src="assets/js/terminal.js"></script>
<script src="assets/js/state.js"></script>
<script src="assets/js/generator.js"></script>
<script src="assets/js/app.js"></script>
<!-- CyberLab V4: database bridge (hydrates + persists account progress) -->
<script src="assets/js/server-bridge.js"></script>
</body>
</html>
