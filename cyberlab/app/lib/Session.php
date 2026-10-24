<?php
/* ============================================================================
 * Session.php - hardened PHP session handling
 * ----------------------------------------------------------------------------
 * - Cookie-only session id (never accepted from URL), strict mode, our own
 *   cookie name. - HttpOnly + SameSite=Lax always; Secure over HTTPS (or when
 * SESSION_SECURE=1). Authentication state lives ONLY here (server-side);
 * nothing auth-related is kept in localStorage. - The id is regenerated on
 * login and on password change (fixation defence), and logout clears data,
 * expires the cookie and destroys the server-side session.
 * ==========================================================================*/
declare(strict_types=1);

final class Session
{
    private const COOKIE_NAME = 'CYBERLABSESSID';
    private const ABSOLUTE_LIFETIME = 8 * 3600; // 8 hours, then log in again

    public static function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        ini_set('session.use_only_cookies', '1');
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_trans_sid', '0');
        session_name(self::COOKIE_NAME);
        session_set_cookie_params(self::cookieParams());
        session_start();

        if (isset($_SESSION['created_at_ts']) && time() - (int)$_SESSION['created_at_ts'] > self::ABSOLUTE_LIFETIME) {
            self::destroy();
            session_start();
        }
        $_SESSION['created_at_ts'] = $_SESSION['created_at_ts'] ?? time();
    }

    /** @return array<string,mixed> */
    public static function cookieParams(int $lifetime = 0): array
    {
        $secure = env('SESSION_SECURE');
        return [
            'lifetime' => $lifetime,
            'path'     => '/',
            'domain'   => '',
            'secure'   => $secure !== null ? $secure === '1' : is_https(),
            'httponly' => true,
            'samesite' => 'Lax',
        ];
    }

    public static function regenerate(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id(true);
            $_SESSION['created_at_ts'] = time();
        }
    }

    /** Establish the authenticated identity after credentials verified. */
    public static function login(int $userId, string $username, string $role): void
    {
        self::start();
        self::regenerate();
        $_SESSION['user_id'] = $userId;
        $_SESSION['username'] = $username;
        $_SESSION['role'] = $role;
        $_SESSION['authenticated_at'] = time();
        Csrf::rotate();
    }

    /** Full logout: wipe data, expire the cookie, destroy server session. */
    public static function destroy(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            self::start();
        }
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = self::cookieParams();
            setcookie(session_name(), '', [
                'expires'  => time() - 42000,
                'path'     => $p['path'],
                'domain'   => $p['domain'],
                'secure'   => $p['secure'],
                'httponly' => $p['httponly'],
                'samesite' => $p['samesite'],
            ]);
        }
        session_destroy();
    }

    public static function userId(): ?int
    {
        self::start();
        return isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
    }

    public static function role(): ?string
    {
        self::start();
        return isset($_SESSION['role']) ? (string)$_SESSION['role'] : null;
    }

    /** One-shot flash message, consumed by the next page render. */
    public static function flash(string $key, string $message): void
    {
        self::start();
        $_SESSION['flash'][$key] = $message;
    }

    public static function pullFlash(string $key): ?string
    {
        self::start();
        $message = $_SESSION['flash'][$key] ?? null;
        unset($_SESSION['flash'][$key]);
        return is_string($message) ? $message : null;
    }
}
