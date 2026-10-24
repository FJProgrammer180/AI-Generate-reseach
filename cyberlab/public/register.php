<?php
/* ============================================================================
 * register.php - account registration (creates a REAL row in users +
 * user_profiles + user_progress + user_settings via one transaction).
 * On validation failure the safe fields (username, email) are repopulated;
 * password fields are NEVER echoed back.
 * ==========================================================================*/
declare(strict_types=1);
require dirname(__DIR__) . '/app/bootstrap.php';
require CYBERLAB_APP . '/views/layout.php';

Session::start();
if (Session::userId() !== null) {
    redirect('index.php');
}

$errors = [];
$old = ['username' => '', 'email' => '', 'terms' => false];

try {
    $pdo = db();
} catch (DatabaseUnavailableException $e) {
    render_header('Daftar');
    echo '<div class="notice bad" role="alert">' . e($e->getMessage()) . '</div>';
    render_footer();
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $old['username'] = trim((string)($_POST['username'] ?? ''));
    $old['email'] = trim((string)($_POST['email'] ?? ''));
    $old['terms'] = isset($_POST['terms']);
    try {
        Csrf::assertValid();
        (new AuthService($pdo))->register($_POST);
        Session::flash('ok', 'Akun berhasil dibuat. Silakan masuk dengan akun baru Anda.');
        redirect('login.php');
    } catch (CsrfException $e) {
        $errors['form'] = $e->getMessage();
    } catch (ValidationException $e) {
        $errors = $e->errors;
    } catch (Throwable $e) {
        error_log('[cyberlab] registration failed: ' . $e->getMessage());
        $errors['form'] = 'Terjadi kesalahan pada server. Coba lagi sebentar.';
    }
}

render_header('Daftar');
?>
<div class="auth-wrap">
  <section class="panel auth-card">
    <h1>BUAT AKUN ANALYST</h1>
    <p class="auth-sub">Satu akun untuk seluruh workstation CyberLab: progres CTF, badge, dan
      pencapaian Anda tersimpan permanen di database - bukan hanya di browser.</p>

    <?php if ($errors !== []): ?>
      <div class="error-summary" role="alert">
        <strong>Pendaftaran belum bisa diproses:</strong>
        <ul><?php foreach ($errors as $msg): ?><li><?= e($msg) ?></li><?php endforeach; ?></ul>
      </div>
    <?php endif; ?>

    <form class="auth-form" method="post" action="register.php" data-single-submit novalidate>
      <?= Csrf::field() ?>
      <?php form_field('Username', 'username', 'text', $old['username'], $errors,
          ['required' => 'required', 'autocomplete' => 'username', 'minlength' => '3', 'maxlength' => '32',
           'pattern' => '(?!\.)[A-Za-z0-9_.\-]{3,32}']); ?>
      <?php form_field('Alamat email', 'email', 'email', $old['email'], $errors,
          ['required' => 'required', 'autocomplete' => 'email', 'maxlength' => '254']); ?>

      <label class="field"><span class="field-label">Password</span>
        <div class="password-row">
          <input class="input" type="password" name="password" id="reg-password" required
                 autocomplete="new-password" minlength="10" maxlength="72" data-strength-for="#pw-meter-fill">
          <button class="btn tiny ghost" type="button" data-toggle-password="#reg-password" aria-pressed="false">LIHAT</button>
        </div>
        <div class="meter" aria-hidden="true"><div class="meter-fill" id="pw-meter-fill"></div></div>
        <span class="policy-note" data-strength-note></span>
        <span class="policy-note">minimal 10 karakter - huruf kecil + huruf besar + angka</span>
        <?= field_error($errors, 'password') ?>
      </label>

      <label class="field"><span class="field-label">Konfirmasi password</span>
        <input class="input" type="password" name="password_confirm" required
               autocomplete="new-password" data-match-with="#reg-password">
        <span class="policy-note" data-match-note></span>
        <?= field_error($errors, 'password_confirm') ?>
      </label>

      <label class="terms-row">
        <input type="checkbox" name="terms" value="1" required <?= $old['terms'] ? 'checked' : '' ?>>
        <span>Saya menyetujui ketentuan penggunaan: CyberLab adalah lab pelatihan dengan data
          fiktif; saya memakai keterampilan yang dipelajari hanya untuk tujuan yang sah dan beretika.</span>
      </label>
      <?= field_error($errors, 'terms') ?>

      <button class="btn primary big" type="submit">DAFTAR SEKARANG</button>
    </form>
    <p class="auth-links">Sudah punya akun? <a href="login.php">Masuk di sini</a>.</p>
  </section>
</div>
<?php render_footer(); ?>
