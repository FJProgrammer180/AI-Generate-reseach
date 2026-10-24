<?php
/* ============================================================================
 * AuthService.php - registration, login, profile, password management
 * ----------------------------------------------------------------------------
 * - Passwords: password_hash(PASSWORD_DEFAULT), verified with
 *   password_verify, rehashed on login when the algorithm moves on.
 *   Plaintext is never stored, logged or returned.
 * - Login is throttled per identifier + IP and every failure says exactly
 *   the same thing, with a dummy verify for unknown accounts so timing
 *   does not disclose which usernames/emails exist.
 * - Registration writes users + profile + progress + settings in ONE
 *   transaction; the UNIQUE constraints are the race-proof duplicate guard.
 * ==========================================================================*/
declare(strict_types=1);

final class AuthService
{
    private readonly UserRepository $users;
    private readonly LoginAttemptRepository $attempts;
    private static ?string $dummyHash = null;

    public function __construct(private readonly PDO $pdo)
    {
        $this->users = new UserRepository($pdo);
        $this->attempts = new LoginAttemptRepository($pdo);
    }

    /* --------------------------------------------------------- registration */
    /**
     * @param array<string,mixed> $input raw form body
     * @return int new user id
     * @throws ValidationException aggregated field errors
     */
    public function register(array $input): int
    {
        $errors = [];
        $username = $this->field(fn() => Validator::username($input['username'] ?? null), $errors);
        $email    = $this->field(fn() => Validator::email($input['email'] ?? null), $errors);
        $password = $this->field(fn() => Validator::password($input['password'] ?? null), $errors);

        $confirm = is_string($input['password_confirm'] ?? null) ? $input['password_confirm'] : '';
        if ($password !== null && !hash_equals($password, $confirm)) {
            $errors['password_confirm'] = 'Konfirmasi password tidak sama dengan password.';
        }
        $terms = $input['terms'] ?? null;
        if (!($terms === '1' || $terms === 'on' || $terms === true || $terms === 1)) {
            $errors['terms'] = 'Anda harus menyetujui ketentuan penggunaan untuk mendaftar.';
        }
        if ($username !== null && $this->users->usernameExists($username)) {
            $errors['username'] = 'Username tersebut sudah digunakan. Pilih username lain.';
        }
        if ($email !== null && $this->users->emailExists($email)) {
            $errors['email'] = 'Email tersebut sudah terdaftar. Silakan masuk atau gunakan email lain.';
        }
        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        $hash = password_hash((string)$password, PASSWORD_DEFAULT);
        $this->pdo->beginTransaction();
        try {
            $id = $this->users->createAccount((string)$username, (string)$email, $hash, 'user');
            $this->users->createCompanionRows($id, (string)$username);
            $this->pdo->commit();
            return $id;
        } catch (PDOException $e) {
            $this->pdo->rollBack();
            if ((string)$e->getCode() === '23000') {
                // Lost a race against a parallel registration with the same
                // username/email: the UNIQUE constraint decided, we report
                // which field is now taken without leaking account details.
                if ($this->users->usernameExists((string)$username)) {
                    throw new ValidationException(['username' => 'Username tersebut sudah digunakan. Pilih username lain.']);
                }
                throw new ValidationException(['email' => 'Email tersebut sudah terdaftar. Silakan masuk atau gunakan email lain.']);
            }
            throw $e;
        }
    }

    /* ---------------------------------------------------------------- login */
    /**
     * @return array<string,mixed> the authenticated user row (internal)
     * @throws AuthException generic message for every failure mode
     */
    public function login(string $identifier, string $password, string $ip): array
    {
        $identifier = trim($identifier);
        if ($identifier === '' || $password === '') {
            throw AuthException::invalidCredentials();
        }
        if ($this->attempts->isThrottled($identifier, $ip)) {
            $this->attempts->record($identifier, $ip, false);
            throw AuthException::throttled();
        }

        $user = $this->users->findByUsernameOrEmail($identifier);
        // Always run a real verify (against a dummy hash when the account
        // does not exist) so response time does not reveal valid accounts.
        $hash = $user['password_hash'] ?? self::dummyHash();
        $verified = password_verify($password, (string)$hash);

        if ($user === null || !$verified || (int)$user['is_active'] !== 1) {
            $this->attempts->record($identifier, $ip, false);
            throw AuthException::invalidCredentials();
        }

        $this->attempts->record($identifier, $ip, true);
        if (password_needs_rehash((string)$user['password_hash'], PASSWORD_DEFAULT)) {
            $this->users->updatePasswordHash((int)$user['id'], password_hash($password, PASSWORD_DEFAULT));
        }
        $this->users->touchLastLogin((int)$user['id']);
        Session::login((int)$user['id'], (string)$user['username'], (string)$user['role']);
        return $user;
    }

    public function logout(): void
    {
        Session::destroy();
    }

    /* -------------------------------------------------------------- profile */
    /** @param array<string,mixed> $input @throws ValidationException */
    public function updateProfile(int $userId, array $input): void
    {
        // The target account ALWAYS comes from the authenticated session,
        // never from input: any user_id in the request body is ignored.
        $errors = [];
        $display = $this->field(fn() => Validator::displayName($input['display_name'] ?? null), $errors);
        $avatar  = $this->field(fn() => Validator::avatar($input['avatar'] ?? 'terminal'), $errors);
        $email   = isset($input['email']) ? $this->field(fn() => Validator::email($input['email']), $errors) : null;
        if ($email !== null && $this->users->emailExists($email, $userId)) {
            $errors['email'] = 'Email tersebut sudah digunakan akun lain.';
        }
        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        $user = $this->users->findById($userId);
        $this->pdo->beginTransaction();
        try {
            $this->users->updateProfile($userId, (string)$display, (string)$avatar, Validator::bio($input['bio'] ?? null));
            if ($email !== null && $user !== null && strtolower((string)$user['email']) !== $email) {
                $this->users->updateEmail($userId, $email);
            }
            $this->pdo->commit();
        } catch (PDOException $e) {
            $this->pdo->rollBack();
            if ((string)$e->getCode() === '23000') {
                throw new ValidationException(['email' => 'Email tersebut sudah digunakan akun lain.']);
            }
            throw $e;
        }
    }

    /** @param array<string,mixed> $input @throws ValidationException */
    public function updateSettings(int $userId, array $input): void
    {
        $theme = is_string($input['theme'] ?? null) ? $input['theme'] : 'cyber-dark';
        $language = is_string($input['language'] ?? null) ? $input['language'] : 'id';
        $errors = [];
        if (!in_array($theme, Validator::THEMES, true)) {
            $errors['theme'] = 'Tema tidak dikenal.';
        }
        if (!in_array($language, Validator::LANGUAGES, true)) {
            $errors['language'] = 'Bahasa tidak dikenal.';
        }
        if ($errors !== []) {
            throw new ValidationException($errors);
        }
        $reduced = ($input['reduced_motion'] ?? null) === '1' || ($input['reduced_motion'] ?? null) === true;
        $this->users->updateSettings($userId, $theme, $language, $reduced);
    }

    /** @throws ValidationException */
    public function changePassword(int $userId, string $current, string $new, string $confirm): void
    {
        $user = $this->users->findById($userId);
        if ($user === null || !password_verify($current, (string)$user['password_hash'])) {
            throw new ValidationException(['current_password' => 'Password saat ini tidak cocok.']);
        }
        $errors = [];
        $validNew = $this->field(fn() => Validator::password($new, 'new_password'), $errors);
        if ($validNew !== null && !hash_equals($validNew, $confirm)) {
            $errors['password_confirm'] = 'Konfirmasi password tidak sama dengan password baru.';
        }
        if ($validNew !== null && hash_equals($validNew, $current)) {
            $errors['new_password'] = 'Password baru harus berbeda dari password saat ini.';
        }
        if ($errors !== []) {
            throw new ValidationException($errors);
        }
        $this->users->updatePasswordHash($userId, password_hash((string)$validNew, PASSWORD_DEFAULT));
        // Privilege-level change: fresh session id + CSRF token.
        Session::regenerate();
        Csrf::rotate();
    }

    /* -------------------------------------------------------------- helpers */
    /**
     * Runs one validator, collecting its errors instead of aborting so the
     * form can show every problem at once. Returns null on failure.
     * @param array<string,string> $errors
     */
    private function field(callable $validator, array &$errors): ?string
    {
        try {
            $value = $validator();
            return is_string($value) ? $value : null;
        } catch (ValidationException $e) {
            $errors = array_merge($errors, $e->errors);
            return null;
        }
    }

    private static function dummyHash(): string
    {
        // Hash of random bytes that no password matches; only exists to make
        // "unknown account" cost the same verify time as "wrong password".
        return self::$dummyHash ??= password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
    }
}
