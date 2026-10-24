<?php
/* ============================================================================
 * bootstrap.php - CyberLab V4 application bootstrap
 * ----------------------------------------------------------------------------
 * Loads environment variables (real env wins, then cyberlab/.env), registers
 * a tiny class autoloader, and defines shared HTTP helpers. Every public
 * entry point (and every CLI script) starts by requiring this file. It lives
 * OUTSIDE public/ so it is never directly reachable from the web.
 * ==========================================================================*/
declare(strict_types=1);

define('CYBERLAB_ROOT', dirname(__DIR__));
define('CYBERLAB_APP', __DIR__);
define('CYBERLAB_PUBLIC', CYBERLAB_ROOT . '/public');

/* --------------------------------------------------------------------- env */
(function (): void { // load .env (real environment variables win)
    $file = CYBERLAB_ROOT . '/.env';
    if (!is_file($file)) {
        return;
    }
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if (strlen($value) >= 2 && ($value[0] === '"' || $value[0] === "'") && $value[strlen($value) - 1] === $value[0]) {
            $value = substr($value, 1, -1);
        }
        if ($key !== '' && getenv($key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
        }
    }
})();

function env(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $default;
    }
    return $value;
}

/* ---------------------------------------------------------------- autoload */
spl_autoload_register(static function (string $class): void {
    static $dirs = ['config', 'lib', 'models', 'services', 'middleware'];
    foreach ($dirs as $dir) {
        $path = CYBERLAB_APP . '/' . $dir . '/' . $class . '.php';
        if (is_file($path)) {
            require_once $path;
            return;
        }
    }
    // Database lives in config/database.php (lowercase filename per spec).
    if ($class === 'Database') {
        require_once CYBERLAB_APP . '/config/database.php';
    }
});

require_once CYBERLAB_APP . '/lib/Exceptions.php';

/* --------------------------------------------------------- error reporting */
/* Users always see generic messages; diagnostics go to the server log.      */
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

/* ----------------------------------------------------------------- helpers */
/** Escape a string for HTML output (the ONLY way user data reaches a page). */
function e(mixed $value): string
{
    return htmlspecialchars((string)($value ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function redirect(string $url): never
{
    header('Location: ' . $url);
    exit;
}

/** @param array<string,mixed> $payload */
function json_out(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/** Decode a JSON request body; returns [] for empty/invalid bodies. */
function json_in(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/** Best-effort client IP for throttling logs (first hop when proxied). */
function client_ip(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    return is_string($ip) ? substr($ip, 0, 45) : '';
}

function is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off') {
        return true;
    }
    return strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
}

/** Current server time as a MySQL/SQLite DATETIME string. */
function now_string(?int $timestamp = null): string
{
    return date('Y-m-d H:i:s', $timestamp ?? time());
}

/** A shared PDO connection for web requests and CLI scripts. */
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $pdo = Database::connect();
    }
    return $pdo;
}
