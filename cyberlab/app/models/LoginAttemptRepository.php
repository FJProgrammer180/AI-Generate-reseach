<?php
/* ============================================================================
 * LoginAttemptRepository.php - evidence table for login throttling
 * A login is refused when the same identifier OR the same IP produced
 * MAX_FAILURES failed attempts inside the rolling WINDOW_MINUTES window.
 * Successes do not erase history (separate rows), so slow guessing across a
 * success is still visible. Passwords are never recorded.
 * ==========================================================================*/
declare(strict_types=1);

final class LoginAttemptRepository
{
    public const MAX_FAILURES = 5;
    public const WINDOW_MINUTES = 15;

    public function __construct(private readonly PDO $pdo)
    {
    }

    public function record(string $identifier, string $ip, bool $success, ?string $at = null): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO login_attempts (identifier, ip_address, success, attempted_at) VALUES (:i, :ip, :s, :t)'
        );
        $stmt->bindValue('i', substr($identifier, 0, 254));
        $stmt->bindValue('ip', substr($ip, 0, 45));
        $stmt->bindValue('s', $success ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue('t', $at ?? now_string());
        $stmt->execute();
    }

    public function isThrottled(string $identifier, string $ip, ?int $now = null): bool
    {
        $since = now_string(($now ?? time()) - self::WINDOW_MINUTES * 60);
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) FROM login_attempts
              WHERE success = 0 AND attempted_at >= :since
                AND (LOWER(identifier) = LOWER(:identifier) OR (ip_address <> \'\' AND ip_address = :ip))'
        );
        $stmt->execute(['since' => $since, 'identifier' => $identifier, 'ip' => $ip]);
        return (int)$stmt->fetchColumn() >= self::MAX_FAILURES;
    }
}
