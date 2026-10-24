<?php
/* ============================================================================
 * Csrf.php - per-session CSRF tokens for every state-changing request
 * Forms embed Csrf::field(); JS sends the token as X-CSRF-Token. Validation
 * is constant-time (hash_equals) and raises CsrfException on mismatch.
 * ==========================================================================*/
declare(strict_types=1);

final class Csrf
{
    private const KEY = 'csrf_token';

    public static function token(): string
    {
        Session::start();
        if (empty($_SESSION[self::KEY])) {
            $_SESSION[self::KEY] = bin2hex(random_bytes(32));
        }
        return (string)$_SESSION[self::KEY];
    }

    public static function rotate(): string
    {
        Session::start();
        $_SESSION[self::KEY] = bin2hex(random_bytes(32));
        return (string)$_SESSION[self::KEY];
    }

    public static function field(): string
    {
        return '<input type="hidden" name="csrf_token" value="' . e(self::token()) . '">';
    }

    /** The token as presented by this request (header beats form field). */
    public static function presentedToken(?array $body = null): string
    {
        $header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
        if (is_string($header) && $header !== '') {
            return $header;
        }
        $fromBody = $body['csrf_token'] ?? ($_POST['csrf_token'] ?? '');
        return is_string($fromBody) ? $fromBody : '';
    }

    /** @throws CsrfException */
    public static function assertValid(?array $body = null): void
    {
        Session::start();
        $expected = $_SESSION[self::KEY] ?? '';
        $given = self::presentedToken($body);
        if (!is_string($expected) || $expected === '' || !hash_equals($expected, $given)) {
            throw new CsrfException();
        }
    }
}
