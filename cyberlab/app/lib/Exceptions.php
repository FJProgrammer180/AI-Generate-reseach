<?php
/* ============================================================================
 * Exceptions.php - domain exceptions whose messages are safe to show users
 * (Indonesian, generic where security requires it, never containing SQL,
 * DSNs, password material or which-credential-was-wrong information).
 * ==========================================================================*/
declare(strict_types=1);

/** Form validation failure. Carries per-field messages for re-rendering. */
final class ValidationException extends Exception
{
    /** @param array<string,string> $errors field name => message */
    public function __construct(
        public readonly array $errors,
        string $message = 'Data yang dikirim belum valid.'
    ) {
        parent::__construct($message);
    }
}

/** Authentication failure. Message is deliberately generic. */
final class AuthException extends Exception
{
    public static function invalidCredentials(): self
    {
        // Same wording for "no such user", "wrong password" and
        // "account inactive" so login cannot be used to enumerate accounts.
        return new self('Username/email atau password tidak valid.');
    }

    public static function throttled(): self
    {
        return new self('Terlalu banyak percobaan login. Silakan tunggu beberapa menit lalu coba lagi.');
    }
}

/** The database could not be reached/initialised. */
final class DatabaseUnavailableException extends RuntimeException
{
}

/** A state-changing request arrived without a valid CSRF token. */
final class CsrfException extends Exception
{
    public function __construct(string $message = 'Token keamanan tidak valid. Muat ulang halaman lalu coba lagi.')
    {
        parent::__construct($message);
    }
}
