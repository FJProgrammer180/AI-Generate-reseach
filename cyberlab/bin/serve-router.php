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
 *
 * The router also canonicalises the friendly page URLs people commonly
 * type (`/login`, `/register`, `/index.html`) and renders CyberLab's own
 * 404 page instead of PHP's bare "Not Found" response.
 * ==========================================================================*/
declare(strict_types=1);

$public = dirname(__DIR__) . '/public';
$publicReal = realpath($public);
$requestUri = (string)($_SERVER['REQUEST_URI'] ?? '/');
$uri = urldecode((string)(parse_url($requestUri, PHP_URL_PATH) ?: '/'));
$uri = str_replace('\\', '/', $uri);
$query = parse_url($requestUri, PHP_URL_QUERY);
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

// Friendly/canonical aliases. GET/HEAD requests redirect to the canonical
// .php URL; other methods execute the target directly so a form/API client
// that used the alias does not lose its request body in a redirect.
$aliases = [
    '/index' => '/index.php',
    '/index.html' => '/index.php',
    '/login' => '/login.php',
    '/login/' => '/login.php',
    '/register' => '/register.php',
    '/register/' => '/register.php',
    '/profile' => '/profile.php',
    '/profile/' => '/profile.php',
    '/admin' => '/admin.php',
    '/admin/' => '/admin.php',
    '/logout' => '/logout.php',
    '/logout/' => '/logout.php',
];
if (isset($aliases[$uri])) {
    $target = $aliases[$uri];
    if ($method === 'GET' || $method === 'HEAD') {
        header('Location: ' . $target . (is_string($query) && $query !== '' ? '?' . $query : ''), true, 302);
        return true;
    }
    require $public . $target;
    return true;
}

if ($uri !== '/' && $publicReal !== false) {
    $candidate = realpath($publicReal . $uri);
    if (
        $candidate !== false
        && str_starts_with($candidate, $publicReal . DIRECTORY_SEPARATOR)
        && is_file($candidate)
    ) {
        return false; // built-in server serves the file (incl. .php execution)
    }
}

if (str_starts_with($uri, '/assets/')) {
    $academyFile = dirname(__DIR__, 2) . '/ctf-analyst-academy' . $uri;
    // Normalise and confine to the academy assets directory.
    $base = realpath(dirname(__DIR__, 2) . '/ctf-analyst-academy/assets');
    $real = $base !== false ? realpath($academyFile) : false;
    if ($real !== false && $base !== false && str_starts_with($real, $base) && is_file($real)) {
        $types = [
            'css' => 'text/css',
            'js' => 'text/javascript',
            'html' => 'text/html',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',
            'json' => 'application/json',
        ];
        $ext = strtolower(pathinfo($real, PATHINFO_EXTENSION));
        $binary = in_array($ext, ['png', 'jpg', 'jpeg', 'ico'], true);
        header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream') . ($binary ? '' : '; charset=utf-8'));
        header('X-Content-Type-Options: nosniff');
        readfile($real);
        return true;
    }
}

// The application home page remains the account-gated workstation.
if ($uri === '/' || $uri === '') {
    require $public . '/index.php';
    return true;
}

// Unknown API endpoints get a machine-readable 404; browser routes get the
// branded CyberLab page with working shortcuts.
if (str_starts_with($uri, '/api/')) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode([
        'ok' => false,
        'error' => 'not_found',
        'message' => 'Endpoint tidak ditemukan.',
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    return true;
}

$_SERVER['SCRIPT_NAME'] = '/404.php';
$_SERVER['PHP_SELF'] = '/404.php';
require $public . '/404.php';
return true;
