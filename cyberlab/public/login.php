<?php
/* ============================================================================
 * login.php - database-backed login.
 * Credentials are checked against users.password_hash with password_verify()
 * inside AuthService (throttled, generic errors, no user enumeration). On
 * success the session id is regenerated and last_login_at is updated.
 * ==========================================================================*/
declare(strict_types=1);
require dirname(__DIR__) . '/app/bootstrap.php';
require CYBERLAB_APP . '/views/layout.php';

Session::start();
$next = AuthGuard::safeNext(is_string($_GET['next'] ?? null) ? $_GET['next'] : null);
if (Session::userId() !== null) {
    redirect($next);
}

$error = null;
$identifier = '';

try {
    $pdo = db();
} catch (DatabaseUnavailableException $e) {
    render_header('Masuk');
    echo '<div class="notice bad" role="alert">' . e($e->getMessage()) . '</div>';
    render_footer();
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $identifier = trim((string)($_POST['identifier'] ?? ''));
    $next = AuthGuard::safeNext(is_string($_POST['next'] ?? null) ? $_POST['next'] : null);
    try {
        Csrf::assertValid();
        (new AuthService($pdo))->login($identifier, (string)($_POST['password'] ?? ''), client_ip());
        redirect($next);
    } catch (CsrfException $e) {
        $error = $e->getMessage();
    } catch (AuthException $e) {
        $error = $e->getMessage(); // deliberately generic - see AuthService
    } catch (Throwable $e) {
        error_log('[cyberlab] login failed: ' . $e->getMessage());
        $error = 'Terjadi kesalahan pada server. Coba lagi sebentar.';
    }
}

render_header('Masuk');
?>
<div class="auth-wrap">
  <section class="panel auth-card">
    <h1>MASUK KE WORKSTATION</h1>
    <p class="auth-sub">Gunakan akun CyberLab Anda. Progres, XP, poin, dan badge akan dimuat
      dari database akun Anda.</p>

    <?php if ($error !== null): ?>
      <div class="error-summary" role="alert"><?= e($error) ?></div>
    <?php endif; ?>

    <form class="auth-form" method="post" action="login.php" data-single-submit>
      <?= Csrf::field() ?>
      <input type="hidden" name="next" value="<?= e($next) ?>">
      <?php form_field('Username atau email', 'identifier', 'text', $identifier, [],
          ['required' => 'required', 'autocomplete' => 'username']); ?>

      <label class="field"><span class="field-label">Password</span>
        <div class="password-row">
          <input class="input" type="password" name="password" id="login-password" required autocomplete="current-password">
          <button class="btn tiny ghost" type="button" data-toggle-password="#login-password" aria-pressed="false">LIHAT</button>
        </div>
      </label>

      <button class="btn primary big" type="submit">MASUK</button>
    </form>
    <p class="auth-links">Belum punya akun? <a href="register.php">Daftar gratis</a>.</p>
    <p class="policy-note">Sesi memakai cookie HttpOnly di sisi server. Demi keamanan, pesan kesalahan
      login tidak membedakan &ldquo;akun tidak ada&rdquo; dan &ldquo;password salah&rdquo;.</p>
  </section>
</div>
<?php render_footer(); ?>
