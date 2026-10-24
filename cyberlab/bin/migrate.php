<?php
/* ============================================================================
 * bin/migrate.php - apply the database schema from the CLI.
 *   php bin/migrate.php            (uses DB_DRIVER from .env / environment)
 * MySQL: runs database/schema.sql (creates cyberlab_db when missing - note
 * the DSN names the database, so create it with phpMyAdmin or
 * `mysql -u root -p -e "CREATE DATABASE cyberlab_db"` first if this reports
 * "unknown database"). SQLite: creates the file (and storage dir) as needed.
 * Safe to re-run: every statement is CREATE ... IF NOT EXISTS.
 * ==========================================================================*/
declare(strict_types=1);
require dirname(__DIR__) . '/app/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Skrip ini hanya untuk CLI.\n");
    exit(1);
}

$cfg = Database::config();
$driver = (string)$cfg['driver'];

if ($driver === 'sqlite') {
    $path = (string)$cfg['sqlite'];
    if ($path !== ':memory:' && $path[0] !== '/') {
        $dir = CYBERLAB_ROOT . '/' . dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
    }
}

try {
    $pdo = Database::connect();
} catch (DatabaseUnavailableException $e) {
    $prev = $e->getPrevious();
    fwrite(STDERR, 'GAGAL: ' . $e->getMessage() . PHP_EOL);
    if ($prev !== null) {
        fwrite(STDERR, 'Detail driver: ' . $prev->getMessage() . PHP_EOL);
        if ($driver === 'mysql' && str_contains($prev->getMessage(), 'Unknown database')) {
            fwrite(STDERR, "Buat databasenya dulu:\n  mysql -u root -p -e \"CREATE DATABASE cyberlab_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\"\natau impor database/schema.sql lewat phpMyAdmin (file itu membuat database sekaligus tabelnya).\n");
        }
    }
    exit(1);
}

$schemaFile = CYBERLAB_ROOT . '/database/' . ($driver === 'sqlite' ? 'schema.sqlite.sql' : 'schema.sql');
$sql = file_get_contents($schemaFile);
if ($sql === false) {
    fwrite(STDERR, "File skema tidak ditemukan: {$schemaFile}\n");
    exit(1);
}

// Strip comment lines BEFORE splitting: schema comments legitimately
// contain semicolons. The MySQL file's CREATE DATABASE/USE lines (kept for
// phpMyAdmin convenience) are then skipped when applying via a connection.
$sql = preg_replace('/^--.*$/m', '', $sql) ?? $sql;
$statements = array_filter(array_map('trim', explode(';', $sql)), static function (string $s): bool {
    if ($s === '') {
        return false;
    }
    return preg_match('/^(CREATE DATABASE|USE)\b/i', $s) !== 1;
});

$applied = 0;
foreach ($statements as $statement) {
    $pdo->exec($statement);
    $applied++;
}

$tables = $driver === 'sqlite'
    ? $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")->fetchAll(PDO::FETCH_COLUMN)
    : $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);

echo "Driver: {$driver}\n";
echo "Perintah diterapkan: {$applied}\n";
echo 'Tabel: ' . implode(', ', $tables) . "\n";
echo "Migrasi selesai.\n";
