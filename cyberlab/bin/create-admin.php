<?php
/* ============================================================================
 * bin/create-admin.php - create the FIRST administrator, deliberately.
 * ----------------------------------------------------------------------------
 * There is no default admin password anywhere in this project and web
 * registration always creates role='user'. The first admin is made here, on
 * purpose, from the server shell:
 *
 *   php bin/create-admin.php <username> <email>
 *       (you will be asked for the password twice; input is hidden on TTYs)
 *   php bin/create-admin.php --promote-existing <username>
 *       (promote an already-registered account instead of creating one)
 *
 * Safety: if ANY administrator already exists this script refuses, unless
 * you pass --force (intended for adding further admins from the shell; the
 * normal path after bootstrap is the admin panel). Exit codes: 0 ok, 1 error.
 * ==========================================================================*/
declare(strict_types=1);
require dirname(__DIR__) . '/app/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Skrip ini hanya untuk CLI.\n");
    exit(1);
}

$args = array_slice($argv, 1);
$force = in_array('--force', $args, true);
$promote = in_array('--promote-existing', $args, true);
$positional = array_values(array_filter($args, static fn(string $a): bool => !str_starts_with($a, '--')));

try {
    $pdo = Database::connect();
} catch (DatabaseUnavailableException $e) {
    fwrite(STDERR, 'GAGAL: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
$users = new UserRepository($pdo);

if ($users->countAdmins() > 0 && !$force) {
    fwrite(STDERR, "DITOLAK: sudah ada administrator di database.\n"
        . "Gunakan panel admin untuk mengelola akun, atau jalankan ulang dengan --force bila Anda memang pemilik server dan paham risikonya.\n");
    exit(1);
}

function askHidden(string $prompt): string
{
    echo $prompt;
    $hidden = false;
    if (DIRECTORY_SEPARATOR !== '\\' && stream_isatty(STDIN)) {
        shell_exec('stty -echo');
        $hidden = true;
    }
    $line = fgets(STDIN);
    if ($hidden) {
        shell_exec('stty echo');
        echo PHP_EOL;
    }
    return trim((string)$line);
}

try {
    if ($promote) {
        $username = $positional[0] ?? '';
        if ($username === '') {
            fwrite(STDERR, "Pemakaian: php bin/create-admin.php --promote-existing <username>\n");
            exit(1);
        }
        $target = $users->findByUsernameOrEmail($username);
        if ($target === null) {
            fwrite(STDERR, "GAGAL: akun '{$username}' tidak ditemukan. Daftarkan dulu lewat halaman register.\n");
            exit(1);
        }
        $users->setRole((int)$target['id'], 'admin');
        echo "OK: @{$target['username']} sekarang administrator.\n";
        exit(0);
    }

    [$username, $email] = [$positional[0] ?? null, $positional[1] ?? null];
    if ($username === null || $email === null) {
        fwrite(STDERR, "Pemakaian:\n  php bin/create-admin.php <username> <email>\n  php bin/create-admin.php --promote-existing <username>\n");
        exit(1);
    }
    $username = Validator::username($username);
    $email = Validator::email($email);
    if ($users->usernameExists($username)) {
        throw new ValidationException(['username' => 'Username sudah dipakai. Gunakan --promote-existing untuk akun yang sudah terdaftar.']);
    }
    if ($users->emailExists($email)) {
        throw new ValidationException(['email' => 'Email sudah dipakai.']);
    }

    $password = askHidden('Password administrator baru: ');
    $confirm = askHidden('Ulangi password: ');
    if (!hash_equals($password, $confirm)) {
        fwrite(STDERR, "GAGAL: konfirmasi password tidak sama.\n");
        exit(1);
    }
    $password = Validator::password($password);

    $pdo->beginTransaction();
    try {
        $id = $users->createAccount($username, $email, password_hash($password, PASSWORD_DEFAULT), 'admin');
        $users->createCompanionRows($id, $username);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    echo "OK: administrator #{$id} (@{$username}) dibuat. Masuk lewat login.php.\n";
} catch (ValidationException | PDOException $e) {
    $msg = $e instanceof ValidationException ? implode(' ', $e->errors) : $e->getMessage();
    fwrite(STDERR, 'GAGAL: ' . $msg . PHP_EOL);
    exit(1);
}
