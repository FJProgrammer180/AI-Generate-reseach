<?php
/* ============================================================================
 * profile.php - account page (protected).
 * Shows ONLY database values for the authenticated account: profile fields,
 * aggregate progress, per-category learning progress, recent challenge
 * activity and earned achievements. All writes are POST + CSRF and always
 * target the session's user id - there is no id parameter to tamper with.
 * Email policy: changing email requires the address to stay unique; there
 * is no mail infrastructure in this lab, so the new address takes effect
 * immediately (documented in the README).
 * ==========================================================================*/
declare(strict_types=1);
require dirname(__DIR__) . '/app/bootstrap.php';
require CYBERLAB_APP . '/views/layout.php';

$pdo = db();
$user = AuthGuard::requireAuth($pdo);
$users = new UserRepository($pdo);
$userId = (int)$user['id'];
$auth = new AuthService($pdo);

$errors = [];
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    try {
        Csrf::assertValid();
        $action = (string)($_POST['action'] ?? '');
        if ($action === 'profile') {
            $auth->updateProfile($userId, $_POST);
            Session::flash('ok', 'Profil berhasil diperbarui.');
        } elseif ($action === 'settings') {
            $auth->updateSettings($userId, $_POST);
            Session::flash('ok', 'Pengaturan berhasil disimpan.');
        } elseif ($action === 'password') {
            $auth->changePassword(
                $userId,
                (string)($_POST['current_password'] ?? ''),
                (string)($_POST['new_password'] ?? ''),
                (string)($_POST['password_confirm'] ?? '')
            );
            Session::flash('ok', 'Password berhasil diubah. Sesi telah diperbarui demi keamanan.');
        } else {
            $errors['form'] = 'Aksi tidak dikenal.';
        }
        if ($errors === []) {
            redirect('profile.php'); // PRG: never resubmit on refresh
        }
    } catch (CsrfException $e) {
        $errors['form'] = $e->getMessage();
    } catch (ValidationException $e) {
        $errors = $e->errors;
    } catch (Throwable $e) {
        error_log('[cyberlab] profile update failed: ' . $e->getMessage());
        $errors['form'] = 'Terjadi kesalahan pada server. Coba lagi sebentar.';
    }
}

$user = $users->findById($userId) ?? $user;
$profile = $users->profile($userId);
$settings = $users->settings($userId);
$account = UserRepository::publicAccount($user, $profile);

$catalog = Catalog::shared();
$progressRepo = new ProgressRepository($pdo);
$progressService = new ChallengeService($pdo, $catalog);
$state = $progressService->statePayload($userId);
$progress = $state['progress'];
$recent = $progressRepo->recentSolves($userId, 8);
$achievementCodes = array_flip(array_column($state['achievements'], 'code'));
$categoryTotals = $catalog->categoryCounts();

$avatarGlyphs = ['terminal' => '⌁', 'shield' => '⛨', 'ghost' => '☾', 'robot' => '⚙', 'fox' => '✦', 'owl' => '◉', 'key' => '⚿', 'bug' => '✸'];

render_header('Profil', $account);
if ($errors !== []) {
    echo '<div class="error-summary" role="alert"><strong>Perubahan belum disimpan:</strong><ul>';
    foreach ($errors as $msg) {
        echo '<li>' . e($msg) . '</li>';
    }
    echo '</ul></div>';
}
?>
<section class="panel">
  <div class="panel-head"><h2>AKUN SAYA</h2>
    <span class="avatar-badge"><span class="avatar-glyph" aria-hidden="true"><?= e($avatarGlyphs[$account['avatar']] ?? '⌁') ?></span>
    <span><strong><?= e($account['displayName']) ?></strong> <span class="mono">@<?= e($account['username']) ?></span></span></span>
  </div>
  <dl class="kv">
    <dt>Username</dt><dd class="mono">@<?= e($account['username']) ?></dd>
    <dt>Email</dt><dd><?= e($account['email']) ?></dd>
    <dt>Role</dt><dd><?= $account['role'] === 'admin' ? '<span class="role-admin">admin</span>' : 'user' ?></dd>
    <dt>Status akun</dt><dd><?= $account['isActive'] ? '<span class="status-on">aktif</span>' : '<span class="status-off">nonaktif</span>' ?></dd>
    <dt>Terdaftar sejak</dt><dd><?= e($account['createdAt']) ?></dd>
    <dt>Login terakhir</dt><dd><?= e($account['lastLoginAt'] ?? '-') ?></dd>
    <?php if (!empty($account['bio'])): ?><dt>Bio</dt><dd><?= e($account['bio']) ?></dd><?php endif; ?>
  </dl>
</section>

<section class="panel">
  <div class="panel-head"><h2>STATISTIK CTF SAYA (DARI DATABASE)</h2></div>
  <div class="hero-stats">
    <div class="stat-card"><div class="stat-value"><?= (int)$progress['currentLevel'] ?></div><div class="stat-label">LEVEL</div><div class="stat-sub"><?= (int)$progress['levelInto'] ?> / <?= (int)$progress['levelNeeded'] ?> XP</div></div>
    <div class="stat-card"><div class="stat-value"><?= number_format((int)$progress['totalXp']) ?></div><div class="stat-label">TOTAL XP</div></div>
    <div class="stat-card"><div class="stat-value"><?= number_format((int)$progress['totalPoints']) ?></div><div class="stat-label">POIN CTF</div><div class="stat-sub">dari <?= number_format($catalog->totalPoints()) ?></div></div>
    <div class="stat-card"><div class="stat-value"><?= (int)$progress['challengesSolved'] ?> / <?= $catalog->count() ?></div><div class="stat-label">CHALLENGE SELESAI</div></div>
    <div class="stat-card"><div class="stat-value"><?= count($state['achievements']) ?> / <?= count(AchievementService::BADGES) ?></div><div class="stat-label">ACHIEVEMENT SERVER</div><div class="stat-sub">+ Generator Adept (perangkat)</div></div>
  </div>

  <div class="sub-head">PROGRES PER KATEGORI</div>
  <?php foreach ($categoryTotals as $cat => $total):
      $done = (int)($state['byCategory'][$cat] ?? 0);
      $pct = $total > 0 ? (int)round($done / $total * 100) : 0; ?>
    <div class="bar-row2"><span class="bar-label2"><?= e($cat) ?></span>
      <div class="progress wide"><div class="progress-bar" style="width:<?= $pct ?>%"></div></div>
      <span class="mono"><?= $done ?>/<?= (int)$total ?></span></div>
  <?php endforeach; ?>

  <div class="sub-head">AKTIVITAS CHALLENGE TERBARU</div>
  <?php if ($recent === []): ?>
    <p class="empty-note">Belum ada challenge yang diselesaikan. <a href="index.php">Buka workstation</a> untuk mulai.</p>
  <?php else: ?>
    <ul class="activity-list">
      <?php foreach ($recent as $row):
          $ch = $catalog->find((string)$row['challenge_id']); ?>
        <li><span><span class="mono"><?= e($row['challenge_id']) ?></span> - <?= e($ch['title'] ?? '') ?>
          <span class="chip skill"><?= e($ch['category'] ?? '') ?></span></span>
          <span class="activity-meta">+<?= (int)$row['xp_awarded'] ?> XP · +<?= (int)$row['points_awarded'] ?> PTS · <?= e($row['solved_at']) ?></span></li>
      <?php endforeach; ?>
    </ul>
  <?php endif; ?>

  <div class="sub-head">ACHIEVEMENT</div>
  <div class="skills-row">
    <?php foreach (AchievementService::BADGES as $code => [$name, $desc]): ?>
      <span class="chip <?= isset($achievementCodes[$code]) ? 'xp' : 'skill' ?>" title="<?= e($desc) ?>"><?= isset($achievementCodes[$code]) ? '★ ' : '' ?><?= e($name) ?></span>
    <?php endforeach; ?>
  </div>
</section>

<div class="grid-2">
  <section class="panel">
    <div class="panel-head"><h2>UBAH PROFIL</h2></div>
    <form class="auth-form" method="post" action="profile.php">
      <?= Csrf::field() ?><input type="hidden" name="action" value="profile">
      <?php form_field('Nama tampilan', 'display_name', 'text', (string)($profile['display_name'] ?? ''), $errors, ['required' => 'required', 'maxlength' => '60']); ?>
      <?php form_field('Email', 'email', 'email', (string)$account['email'], $errors, ['required' => 'required', 'maxlength' => '254']); ?>
      <label class="field"><span class="field-label">Avatar</span>
        <select class="input" name="avatar">
          <?php foreach (Validator::AVATARS as $av): ?>
            <option value="<?= e($av) ?>" <?= ($profile['avatar'] ?? '') === $av ? 'selected' : '' ?>><?= e($av) ?></option>
          <?php endforeach; ?>
        </select><?= field_error($errors, 'avatar') ?></label>
      <label class="field"><span class="field-label">Bio (opsional, maks 280 karakter)</span>
        <textarea class="input" name="bio" maxlength="280"><?= e($profile['bio'] ?? '') ?></textarea></label>
      <p class="policy-note">Kebijakan email: perubahan langsung berlaku setelah pemeriksaan keunikan;
        lab ini tidak mengirim email verifikasi (tidak ada infrastruktur surat).</p>
      <div class="form-actions"><button class="btn primary" type="submit">SIMPAN PROFIL</button></div>
    </form>
  </section>

  <section class="panel">
    <div class="panel-head"><h2>PENGATURAN</h2></div>
    <form class="auth-form" method="post" action="profile.php">
      <?= Csrf::field() ?><input type="hidden" name="action" value="settings">
      <label class="field"><span class="field-label">Tema</span>
        <select class="input" name="theme">
          <?php foreach (Validator::THEMES as $t): ?>
            <option value="<?= e($t) ?>" <?= ($settings['theme'] ?? '') === $t ? 'selected' : '' ?>><?= e($t) ?></option>
          <?php endforeach; ?>
        </select></label>
      <label class="field"><span class="field-label">Bahasa antarmuka akun</span>
        <select class="input" name="language">
          <option value="id" <?= ($settings['language'] ?? '') === 'id' ? 'selected' : '' ?>>Indonesia</option>
          <option value="en" <?= ($settings['language'] ?? '') === 'en' ? 'selected' : '' ?>>English</option>
        </select></label>
      <label class="checkbox-row">
        <input type="checkbox" name="reduced_motion" value="1" <?= (int)($settings['reduced_motion'] ?? 0) === 1 ? 'checked' : '' ?>>
        <span>Kurangi animasi (reduced motion) di workstation</span></label>
      <div class="form-actions"><button class="btn primary" type="submit">SIMPAN PENGATURAN</button></div>
    </form>

    <div class="panel-head" style="margin-top:1.4rem"><h2>GANTI PASSWORD</h2></div>
    <form class="auth-form" method="post" action="profile.php" data-single-submit>
      <?= Csrf::field() ?><input type="hidden" name="action" value="password">
      <label class="field"><span class="field-label">Password saat ini</span>
        <input class="input" type="password" name="current_password" required autocomplete="current-password">
        <?= field_error($errors, 'current_password') ?></label>
      <label class="field"><span class="field-label">Password baru</span>
        <div class="password-row">
          <input class="input" type="password" name="new_password" id="new-password" required autocomplete="new-password" minlength="10" maxlength="72">
          <button class="btn tiny ghost" type="button" data-toggle-password="#new-password" aria-pressed="false">LIHAT</button>
        </div>
        <span class="policy-note">minimal 10 karakter - huruf kecil + huruf besar + angka</span>
        <?= field_error($errors, 'new_password') ?></label>
      <label class="field"><span class="field-label">Konfirmasi password baru</span>
        <input class="input" type="password" name="password_confirm" required autocomplete="new-password">
        <?= field_error($errors, 'password_confirm') ?></label>
      <div class="form-actions"><button class="btn primary" type="submit">GANTI PASSWORD</button></div>
    </form>
  </section>
</div>
<?php render_footer(); ?>
