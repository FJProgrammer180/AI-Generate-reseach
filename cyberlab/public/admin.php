<?php
/* ============================================================================
 * admin.php - account administration (verified server-side admin only).
 * AuthGuard::requireAdmin() re-reads the role from the database for every
 * request, and AdminService re-checks it inside each mutation. No request
 * parameter can raise anyone's privileges except these admin-only actions.
 * ==========================================================================*/
declare(strict_types=1);
require dirname(__DIR__) . '/app/bootstrap.php';
require CYBERLAB_APP . '/views/layout.php';

$pdo = db();
$admin = AuthGuard::requireAdmin($pdo);
$users = new UserRepository($pdo);
$adminService = new AdminService($pdo);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    try {
        Csrf::assertValid();
        $target = filter_var($_POST['target_id'] ?? null, FILTER_VALIDATE_INT);
        if ($target === false || $target <= 0) {
            throw new ValidationException(['target' => 'ID akun tujuan tidak valid.']);
        }
        $action = (string)($_POST['action'] ?? '');
        $actorId = (int)$admin['id'];
        if ($action === 'activate') {
            $adminService->setActive($actorId, $target, true);
            Session::flash('ok', 'Akun #' . $target . ' diaktifkan.');
        } elseif ($action === 'deactivate') {
            $adminService->setActive($actorId, $target, false);
            Session::flash('ok', 'Akun #' . $target . ' dinonaktifkan.');
        } elseif ($action === 'promote') {
            $adminService->setRole($actorId, $target, 'admin');
            Session::flash('ok', 'Akun #' . $target . ' kini administrator.');
        } elseif ($action === 'demote') {
            $adminService->setRole($actorId, $target, 'user');
            Session::flash('ok', 'Akun #' . $target . ' diturunkan menjadi user.');
        } else {
            throw new ValidationException(['action' => 'Aksi tidak dikenal.']);
        }
        redirect('admin.php' . (isset($_POST['q']) ? '?q=' . urlencode((string)$_POST['q']) : ''));
    } catch (CsrfException | ValidationException | AuthException $e) {
        $message = $e instanceof ValidationException ? implode(' ', $e->errors) : $e->getMessage();
        Session::flash('error', $message);
        redirect('admin.php');
    } catch (Throwable $e) {
        error_log('[cyberlab] admin action failed: ' . $e->getMessage());
        Session::flash('error', 'Aksi gagal karena kesalahan server.');
        redirect('admin.php');
    }
}

$search = trim((string)($_GET['q'] ?? ''));
$accounts = $users->listAccounts($search);
$self = UserRepository::publicAccount($admin, $users->profile((int)$admin['id']));

render_header('Panel Admin', $self);
?>
<section class="panel">
  <div class="panel-head"><h2>PENGGUNA CYBERLAB</h2><span class="mono"><?= count($accounts) ?> akun</span></div>
  <form class="admin-search" method="get" action="admin.php">
    <input class="input" type="search" name="q" value="<?= e($search) ?>" placeholder="cari username / email / nama tampilan..." aria-label="cari pengguna">
    <button class="btn" type="submit">CARI</button>
    <?php if ($search !== ''): ?><a class="btn ghost" href="admin.php">RESET</a><?php endif; ?>
  </form>

  <?php if ($accounts === []): ?>
    <p class="empty-note">Tidak ada akun yang cocok.</p>
  <?php else: ?>
  <table class="data-table">
    <thead><tr><th>ID</th><th>PENGGUNA</th><th>EMAIL</th><th>ROLE</th><th>STATUS</th><th>LEVEL</th><th>XP / POIN</th><th>SOLVED</th><th>DAFTAR</th><th>LOGIN TERAKHIR</th><th>AKSI</th></tr></thead>
    <tbody>
    <?php foreach ($accounts as $a): ?>
      <tr>
        <td class="mono"><?= (int)$a['id'] ?></td>
        <td><strong><?= e($a['display_name']) ?></strong><br><span class="mono">@<?= e($a['username']) ?></span></td>
        <td><?= e($a['email']) ?></td>
        <td><?= $a['role'] === 'admin' ? '<span class="role-admin">admin</span>' : 'user' ?></td>
        <td><?= (int)$a['is_active'] === 1 ? '<span class="status-on">aktif</span>' : '<span class="status-off">nonaktif</span>' ?></td>
        <td class="mono"><?= (int)$a['current_level'] ?></td>
        <td class="mono"><?= number_format((int)$a['total_xp']) ?> / <?= number_format((int)$a['total_points']) ?></td>
        <td class="mono"><?= (int)$a['challenges_solved'] ?></td>
        <td class="mono"><?= e($a['created_at']) ?></td>
        <td class="mono"><?= e($a['last_login_at'] ?? '-') ?></td>
        <td>
          <?php foreach ([
              'promote' => ['PROMOTE', $a['role'] !== 'admin'],
              'demote' => ['DEMOTE', $a['role'] === 'admin'],
              'activate' => ['AKTIFKAN', (int)$a['is_active'] !== 1],
              'deactivate' => ['NONAKTIFKAN', (int)$a['is_active'] === 1],
          ] as $act => [$label, $show]): if (!$show) continue; ?>
            <form method="post" action="admin.php" class="inline-form">
              <?= Csrf::field() ?>
              <input type="hidden" name="target_id" value="<?= (int)$a['id'] ?>">
              <input type="hidden" name="action" value="<?= e($act) ?>">
              <input type="hidden" name="q" value="<?= e($search) ?>">
              <button class="btn tiny <?= in_array($act, ['deactivate', 'demote'], true) ? 'danger' : '' ?>" type="submit"><?= $label ?></button>
            </form>
          <?php endforeach; ?>
        </td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
  <?php endif; ?>
  <p class="policy-note">Perlindungan server: Anda tidak dapat menonaktifkan/menurunkan akun sendiri,
    dan administrator terakhir tidak dapat diturunkan atau dinonaktifkan.</p>
</section>
<?php render_footer(); ?>
