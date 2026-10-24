<?php
/* ============================================================================
 * bin/sync-assets.php - copy the workstation's static assets into public/.
 * ----------------------------------------------------------------------------
 * public/index.php references the academy's original assets (assets/css/
 * style.css, assets/js/*.js, assets/js/data/*.js). In this repository those
 * files live in ../ctf-analyst-academy/assets, so for a standalone deploy
 * (XAMPP/Apache/Nginx without an alias) run:
 *
 *   php bin/sync-assets.php
 *
 * It copies style.css + all engine/data JS into cyberlab/public/assets/,
 * EXCLUDING state.js (the bridge wraps the academy's copy; keeping a single
 * source matters less than never serving a stale duplicate... state.js is
 * copied too - see list - because the workstation needs it locally; re-run
 * this script whenever the academy dataset changes, together with
 * tools/export-catalog.js).
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
