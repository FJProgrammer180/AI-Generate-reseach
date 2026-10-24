<?php
/* ============================================================================
 * config/database.php - PDO connection factory
 * ----------------------------------------------------------------------------
 * Credentials come from environment variables (see .env.example):
 *   DB_DRIVER   mysql (production) | sqlite (development & tests)
 *   DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD     (mysql)
 *   DB_SQLITE_PATH                                  (sqlite)
 *
 * PDO is configured with exception-based errors, associative fetches and
 * REAL prepared statements (emulated prepares disabled) so parameters can
 * never be spliced into SQL text by the driver. A connection failure raises
 * DatabaseUnavailableException with a user-safe message; the underlying
 * PDOException (which may contain a DSN) is logged server-side only and is
 * attached as the previous exception for CLI/test introspection.
 * ==========================================================================*/
declare(strict_types=1);

final class Database
{
    /** @return array<string,?string> */
    public static function config(): array
    {
        return [
            'driver'   => env('DB_DRIVER', 'mysql'),
            'host'     => env('DB_HOST', '127.0.0.1'),
            'port'     => env('DB_PORT', '3306'),
            'name'     => env('DB_NAME', 'cyberlab_db'),
            'user'     => env('DB_USER', 'cyberlab'),
            'password' => env('DB_PASSWORD', ''),
            'sqlite'   => env('DB_SQLITE_PATH', 'storage/cyberlab.sqlite3'),
        ];
    }

    /** @param array<string,?string>|null $cfg */
    public static function dsn(?array $cfg = null): string
    {
        $cfg = $cfg ?? self::config();
        if (($cfg['driver'] ?? 'mysql') === 'sqlite') {
            $path = (string)$cfg['sqlite'];
            if ($path !== ':memory:' && $path[0] !== '/') {
                $path = CYBERLAB_ROOT . '/' . $path;
            }
            return 'sqlite:' . $path;
        }
        return sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $cfg['host'], $cfg['port'], $cfg['name']
        );
    }

    /**
     * @param array<string,?string>|null $cfg  overrides (used by tests)
     * @throws DatabaseUnavailableException with a message safe to show users
     */
    public static function connect(?array $cfg = null): PDO
    {
        $cfg = $cfg ?? self::config();
        $isSqlite = ($cfg['driver'] ?? 'mysql') === 'sqlite';
        try {
            $pdo = new PDO(
                self::dsn($cfg),
                $isSqlite ? null : $cfg['user'],
                $isSqlite ? null : $cfg['password'],
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]
            );
            if ($isSqlite) {
                $pdo->exec('PRAGMA foreign_keys = ON');
            }
            return $pdo;
        } catch (PDOException $e) {
            // Log the detail (never a password - PDO does not print it),
            // surface only a generic, actionable message.
            error_log('[cyberlab] database connection failed: ' . $e->getMessage());
            throw new DatabaseUnavailableException(
                'Koneksi database gagal. Periksa konfigurasi DB_* dan pastikan server database berjalan.',
                0,
                $e
            );
        }
    }
}
