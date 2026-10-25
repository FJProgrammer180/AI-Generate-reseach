<?php
/* ============================================================================
 * bin/sync-assets.php - copy the workstation's static assets into public/.
 * ----------------------------------------------------------------------------
 * public/index.php references the Academy runtime (assets/css/style.css,
 * assets/js/*.js, assets/js/data/*.js). Those files are tracked as
 * byte-for-byte copies in cyberlab/public/assets, so CyberLab can be
 * deployed on its own (XAMPP/Apache/Nginx) without an alias to the sibling
 * academy folder. After changing the canonical Academy sources, refresh and
 * commit the CyberLab copies:
 *
 *   php bin/sync-assets.php
 *   node tools/export-catalog.js
 *   node tools/check-academy-parity.js
 *
 * CyberLab's OWN assets (auth.css, auth.js, server-bridge.js) live there
 * already and are never overwritten.
 * ==========================================================================*/
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Skrip ini hanya untuk CLI.\n");
    exit(1);
}

$root = dirname(__DIR__);
$source = $root . '/../ctf-analyst-academy/assets';
$target = $root . '/public/assets';
if (!is_dir($source)) {
    fwrite(STDERR, "Sumber tidak ditemukan: {$source}\nJalankan dari checkout repositori lengkap.\n");
    exit(1);
}

$ownFiles = ['css/auth.css', 'js/auth.js', 'js/server-bridge.js'];
$copied = 0;
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($source, FilesystemIterator::SKIP_DOTS));
foreach ($iterator as $file) {
    /** @var SplFileInfo $file */
    if (!$file->isFile()) {
        continue;
    }
    $relative = substr($file->getPathname(), strlen($source) + 1);
    $relative = str_replace(DIRECTORY_SEPARATOR, '/', $relative);
    if (in_array($relative, $ownFiles, true)) {
        continue;
    }
    $dest = $target . '/' . $relative;
    if (!is_dir(dirname($dest))) {
        mkdir(dirname($dest), 0775, true);
    }
    if (!copy($file->getPathname(), $dest)) {
        fwrite(STDERR, "Gagal menyalin {$relative}\n");
        exit(1);
    }
    $copied++;
    echo "  {$relative}\n";
}
echo "Sinkronisasi selesai: {$copied} berkas -> public/assets/\n";
echo "Jangan lupa: node tools/export-catalog.js (katalog server mengikuti dataset).\n";
