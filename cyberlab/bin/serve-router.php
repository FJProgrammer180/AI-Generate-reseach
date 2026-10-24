<?php
/* ============================================================================
 * bin/serve-router.php - router for PHP's built-in server (development)
 * ----------------------------------------------------------------------------
 *   php -S 0.0.0.0:8080 -t cyberlab/public cyberlab/bin/serve-router.php
 *
 * Real files under public/ are served as usual. Requests for the academy's
 * static assets that have NOT been copied into public/assets (see
 * bin/sync-assets.php) are transparently served from
 * ../ctf-analyst-academy/assets, so the dev workstation always runs the
 * repository's current dataset without duplicating it.
 * ==========================================================================*/
declare(strict_types=1);

$public = dirname(__DIR__) . '/public';
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');

if ($uri !== '/' && is_file($public . $uri)) {
    return false; // built-in server serves the file (incl. .php execution)
}

if (str_starts_with($uri, '/assets/')) {
    $academyFile = dirname(__DIR__, 2) . '/ctf-analyst-academy' . $uri;
    // Normalise and confine to the academy assets directory.
    $base = realpath(dirname(__DIR__, 2) . '/ctf-analyst-academy/assets');
    $real = $base !== false ? realpath($academyFile) : false;
    if ($real !== false && $base !== false && str_starts_with($real, $base) && is_file($real)) {
        $types = ['css' => 'text/css', 'js' => 'text/javascript', 'html' => 'text/html', 'png' => 'image/png'];
        $ext = strtolower(pathinfo($real, PATHINFO_EXTENSION));
        header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream') . ($ext === 'png' ? '' : '; charset=utf-8'));
        header('X-Content-Type-Options: nosniff');
        readfile($real);
        return true;
    }
}

// Everything else: let the built-in server map it (index.php at "/").
if ($uri === '/' || $uri === '') {
    require $public . '/index.php';
    return true;
}
return false;
