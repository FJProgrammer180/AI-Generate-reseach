<?php
/* ============================================================================
 * AuthGuard.php - server-side authorization for pages and API endpoints
 * ----------------------------------------------------------------------------
 * Every protected entry point calls one of these FIRST. The account row is
 * re-read from the database each request, so deactivation or a role change
 * takes effect on the very next request - a stale session value alone never
 * authorizes anything.
 * ==========================================================================*/
declare(strict_types=1);

final class AuthGuard
{
    /** The current account (users row) or null when not authenticated. */
    public static function currentUser(PDO $pdo): ?array
    {
        $id = Session::userId();
        if ($id === null) {
            return null;
        }
        $user = (new UserRepository($pdo))->findById($id);
        if ($user === null || (int)$user['is_active'] !== 1) {
            Session::destroy();
            return null;
        }
        return $user;
    }

    /** For HTML pages: redirect anonymous visitors to the login page. */
    public static function requireAuth(PDO $pdo): array
    {
        $user = self::currentUser($pdo);
        if ($user === null) {
            $next = $_SERVER['REQUEST_URI'] ?? '/index.php';
            // Only ever return to a local path after login (no open redirect).
            $next = is_string($next) && str_starts_with($next, '/') && !str_starts_with($next, '//') ? $next : '/index.php';
            redirect('login.php?next=' . urlencode($next));
        }
        return $user;
    }

    /** For admin pages: login required, then a live admin-role check. */
    public static function requireAdmin(PDO $pdo): array
    {
        $user = self::requireAuth($pdo);
        if ($user['role'] !== 'admin') {
            http_response_code(403);
            header('Content-Type: text/html; charset=utf-8');
            echo '<!DOCTYPE html><html lang="id"><meta charset="utf-8"><title>403 - CyberLab</title>'
                . '<body style="background:#0b0f14;color:#d6e2ee;font-family:monospace;padding:2rem">'
                . '<h1>403</h1><p>Akses ditolak: halaman ini khusus administrator.</p>'
                . '<p><a style="color:#5ad1a5" href="index.php">Kembali ke workstation</a></p></body></html>';
            exit;
        }
        return $user;
    }

    /** For JSON endpoints: 401 JSON instead of an HTML redirect. */
    public static function requireAuthApi(PDO $pdo): array
    {
        $user = self::currentUser($pdo);
        if ($user === null) {
            json_out(['ok' => false, 'error' => 'unauthenticated', 'message' => 'Silakan masuk terlebih dahulu.'], 401);
        }
        return $user;
    }

    /** Sanitise a post-login return target to a local path under public/. */
    public static function safeNext(?string $next, string $default = 'index.php'): string
    {
        if ($next === null) {
            return $default;
        }
        $next = trim($next);
        // Accept "/index.php" style and bare "index.php" style; reject
        // absolute URLs, protocol-relative URLs and backslash tricks.
        if ($next === '' || str_contains($next, '\\') || preg_match('/^[a-z][a-z0-9+.-]*:/i', $next) === 1) {
            return $default;
        }
        if (str_starts_with($next, '//')) {
            return $default;
        }
        return ltrim($next, '/') ?: $default;
    }
}
