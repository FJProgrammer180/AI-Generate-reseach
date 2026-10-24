<?php
/* ============================================================================
 * UserRepository.php - PDO access for users, profiles and settings
 * Every query is a prepared statement with bound parameters; no request
 * value is ever concatenated into SQL. Password hashes are only ever
 * returned to AuthService internals, never to views or JSON responses.
 * ==========================================================================*/
declare(strict_types=1);

final class UserRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @return array<string,mixed>|null full row INCLUDING password_hash (internal use) */
    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** Login lookup: username OR email, case-insensitive on both drivers. */
    public function findByUsernameOrEmail(string $identifier): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM users
              WHERE LOWER(username) = LOWER(:identifier) OR LOWER(email) = LOWER(:identifier2)
              LIMIT 1'
        );
        // Two placeholders for one value: PDO-MySQL native prepares reject a
        // named placeholder that appears twice in a single statement.
        $stmt->execute(['identifier' => $identifier, 'identifier2' => $identifier]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function usernameExists(string $username): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM users WHERE LOWER(username) = LOWER(:u) LIMIT 1');
        $stmt->execute(['u' => $username]);
        return $stmt->fetchColumn() !== false;
    }

    public function emailExists(string $email, ?int $excludeUserId = null): bool
    {
        $sql = 'SELECT 1 FROM users WHERE LOWER(email) = LOWER(:e)';
        $params = ['e' => $email];
        if ($excludeUserId !== null) {
            $sql .= ' AND id <> :exclude';
            $params['exclude'] = $excludeUserId;
        }
        $stmt = $this->pdo->prepare($sql . ' LIMIT 1');
        $stmt->execute($params);
        return $stmt->fetchColumn() !== false;
    }

    public function createAccount(string $username, string $email, string $passwordHash, string $role = 'user'): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO users (username, email, password_hash, role) VALUES (:u, :e, :h, :r)'
        );
        $stmt->execute(['u' => $username, 'e' => $email, 'h' => $passwordHash, 'r' => $role]);
        return (int)$this->pdo->lastInsertId();
    }

    public function createCompanionRows(int $userId, string $displayName): void
    {
        $now = now_string();
        $this->pdo->prepare(
            'INSERT INTO user_profiles (user_id, display_name, created_at, updated_at) VALUES (:id, :n, :t, :t2)'
        )->execute(['id' => $userId, 'n' => $displayName, 't' => $now, 't2' => $now]);
        $this->pdo->prepare(
            'INSERT INTO user_progress (user_id, created_at, updated_at) VALUES (:id, :t, :t2)'
        )->execute(['id' => $userId, 't' => $now, 't2' => $now]);
        $this->pdo->prepare(
            'INSERT INTO user_settings (user_id, created_at, updated_at) VALUES (:id, :t, :t2)'
        )->execute(['id' => $userId, 't' => $now, 't2' => $now]);
    }

    public function touchLastLogin(int $userId): void
    {
        $now = now_string();
        $this->pdo->prepare('UPDATE users SET last_login_at = :t, updated_at = :t2 WHERE id = :id')
            ->execute(['t' => $now, 't2' => $now, 'id' => $userId]);
    }

    public function updatePasswordHash(int $userId, string $passwordHash): void
    {
        $this->pdo->prepare('UPDATE users SET password_hash = :h, updated_at = :t WHERE id = :id')
            ->execute(['h' => $passwordHash, 't' => now_string(), 'id' => $userId]);
    }

    public function updateEmail(int $userId, string $email): void
    {
        $this->pdo->prepare('UPDATE users SET email = :e, updated_at = :t WHERE id = :id')
            ->execute(['e' => $email, 't' => now_string(), 'id' => $userId]);
    }

    /* -------------------------------------------------------------- profile */
    /** @return array<string,mixed>|null */
    public function profile(int $userId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM user_profiles WHERE user_id = :id');
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function updateProfile(int $userId, string $displayName, string $avatar, ?string $bio): void
    {
        $this->pdo->prepare(
            'UPDATE user_profiles SET display_name = :n, avatar = :a, bio = :b, updated_at = :t WHERE user_id = :id'
        )->execute(['n' => $displayName, 'a' => $avatar, 'b' => $bio, 't' => now_string(), 'id' => $userId]);
    }

    /* ------------------------------------------------------------- settings */
    /** @return array<string,mixed>|null */
    public function settings(int $userId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM user_settings WHERE user_id = :id');
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function updateSettings(int $userId, string $theme, string $language, bool $reducedMotion): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE user_settings SET theme = :th, language = :lang, reduced_motion = :rm, updated_at = :t WHERE user_id = :id'
        );
        $stmt->bindValue('th', $theme);
        $stmt->bindValue('lang', $language);
        $stmt->bindValue('rm', $reducedMotion ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue('t', now_string());
        $stmt->bindValue('id', $userId, PDO::PARAM_INT);
        $stmt->execute();
    }

    /* ---------------------------------------------------------------- admin */
    /** @return list<array<string,mixed>> users + profile + progress, password hash excluded */
    public function listAccounts(string $search = ''): array
    {
        $sql = "SELECT u.id, u.username, u.email, u.role, u.is_active, u.created_at, u.last_login_at,
                       COALESCE(p.display_name, u.username) AS display_name,
                       COALESCE(pr.total_xp, 0) AS total_xp, COALESCE(pr.total_points, 0) AS total_points,
                       COALESCE(pr.current_level, 1) AS current_level, COALESCE(pr.challenges_solved, 0) AS challenges_solved
                  FROM users u
                  LEFT JOIN user_profiles p ON p.user_id = u.id
                  LEFT JOIN user_progress pr ON pr.user_id = u.id";
        $params = [];
        if ($search !== '') {
            $sql .= " WHERE u.username LIKE :q ESCAPE '\\' OR u.email LIKE :q ESCAPE '\\' OR p.display_name LIKE :q ESCAPE '\\'";
            $params['q'] = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search) . '%';
        }
        $stmt = $this->pdo->prepare($sql . ' ORDER BY u.created_at, u.id');
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function countAdmins(): int
    {
        return (int)$this->pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
    }

    public function setRole(int $userId, string $role): void
    {
        $this->pdo->prepare('UPDATE users SET role = :r, updated_at = :t WHERE id = :id')
            ->execute(['r' => $role, 't' => now_string(), 'id' => $userId]);
    }

    public function setActive(int $userId, bool $active): void
    {
        $stmt = $this->pdo->prepare('UPDATE users SET is_active = :a, updated_at = :t WHERE id = :id');
        $stmt->bindValue('a', $active ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue('t', now_string());
        $stmt->bindValue('id', $userId, PDO::PARAM_INT);
        $stmt->execute();
    }

    /**
     * The only public shape of an account: safe fields for pages/JSON.
     * @param array<string,mixed> $user @param array<string,mixed>|null $profile
     * @return array<string,mixed>
     */
    public static function publicAccount(array $user, ?array $profile): array
    {
        return [
            'id'           => (int)$user['id'],
            'username'     => (string)$user['username'],
            'email'        => (string)$user['email'],
            'role'         => (string)$user['role'],
            'isActive'     => (bool)(int)$user['is_active'],
            'createdAt'    => $user['created_at'],
            'lastLoginAt'  => $user['last_login_at'],
            'displayName'  => (string)($profile['display_name'] ?? $user['username']),
            'avatar'       => (string)($profile['avatar'] ?? 'terminal'),
            'bio'          => $profile['bio'] ?? null,
        ];
    }
}
