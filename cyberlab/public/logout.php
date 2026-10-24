<?php
/* ============================================================================
 * logout.php - real logout (POST + CSRF only).
 * Destroys the server-side session, expires the session cookie and returns
 * to the login page. GET renders a tiny confirmation so logout can never be
 * triggered by a third-party image/link.
 * ==========================================================================*/
declare(strict_types=1);
require dirname(__DIR__) . '/app/bootstrap.php';

Session::start();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    try {
        Csrf::assertValid();
    } catch (CsrfException) {
        // Even an expired token should still be able to end a session.
    }
    Session::destroy();
    Session::start();
    Session::flash('ok', 'Anda sudah keluar. Sesi server telah diakhiri.');
    redirect('login.php');
}

require CYBERLAB_APP . '/views/layout.php';
$account = null;
try {
    $user = AuthGuard::currentUser(db());
    if ($user !== null) {
        $account = UserRepository::publicAccount($user, (new UserRepository(db()))->profile((int)$user['id']));
    }
} catch (Throwable) {
    $account = null;
}
render_header('Keluar', $account);
?>
<div class="auth-wrap">
  <section class="panel auth-card">
    <h1>KELUAR DARI WORKSTATION?</h1>
    <p class="auth-sub">Sesi server Anda akan dihancurkan. Progres Anda aman di database dan
      akan dimuat lagi saat Anda masuk berikutnya.</p>
    <form method="post" action="logout.php" class="form-actions">
      <?= Csrf::field() ?>
      <button class="btn danger" type="submit">YA, KELUAR</button>
      <a class="btn ghost" href="index.php">BATALKAN</a>
    </form>
  </section>
</div>
<?php render_footer(); ?>
