<?php
/* ============================================================================
 * Validator.php - server-side input policy for accounts and profiles
 * The browser mirrors some of this for UX only; these checks are the real
 * gate. Every method returns a normalised value or throws ValidationException
 * with a field-keyed, Indonesian, user-safe message.
 * ==========================================================================*/
declare(strict_types=1);

final class Validator
{
    /* 3-32 chars: letters, digits, underscore, dot, hyphen. No leading dot. */
    private const USERNAME_PATTERN = '/\A(?!\.)[A-Za-z0-9_.\-]{3,32}\z/';

    public const PASSWORD_MIN = 10;
    /* PASSWORD_DEFAULT is currently bcrypt, which silently truncates input
       beyond 72 bytes - reject longer passwords instead of truncating them. */
    public const PASSWORD_MAX_BYTES = 72;

    /** @throws ValidationException */
    public static function username(mixed $value): string
    {
        $username = is_string($value) ? trim($value) : '';
        if ($username === '') {
            throw new ValidationException(['username' => 'Username wajib diisi.']);
        }
        if (preg_match(self::USERNAME_PATTERN, $username) !== 1) {
            throw new ValidationException([
                'username' => 'Username harus 3-32 karakter dan hanya boleh berisi huruf, angka, underscore (_), titik (.), atau tanda hubung (-).',
            ]);
        }
        return $username;
    }

    /** @throws ValidationException */
    public static function email(mixed $value): string
    {
        $email = is_string($value) ? strtolower(trim($value)) : '';
        if ($email === '') {
            throw new ValidationException(['email' => 'Email wajib diisi.']);
        }
        if (strlen($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new ValidationException(['email' => 'Format email tidak valid.']);
        }
        return $email;
    }

    /** @throws ValidationException */
    public static function password(mixed $value, string $field = 'password'): string
    {
        $password = is_string($value) ? $value : '';
        if ($password === '') {
            throw new ValidationException([$field => 'Password wajib diisi.']);
        }
        if (strlen($password) < self::PASSWORD_MIN) {
            throw new ValidationException([$field => 'Password minimal ' . self::PASSWORD_MIN . ' karakter.']);
        }
        if (strlen($password) > self::PASSWORD_MAX_BYTES) {
            throw new ValidationException([$field => 'Password maksimal ' . self::PASSWORD_MAX_BYTES . ' karakter.']);
        }
        if (preg_match('/[a-z]/', $password) !== 1 || preg_match('/[A-Z]/', $password) !== 1 || preg_match('/\d/', $password) !== 1) {
            throw new ValidationException([$field => 'Password harus mengandung huruf kecil, huruf besar, dan angka.']);
        }
        return $password;
    }

    /** @throws ValidationException */
    public static function displayName(mixed $value): string
    {
        $name = is_string($value) ? trim($value) : '';
        if ($name === '') {
            throw new ValidationException(['display_name' => 'Nama tampilan wajib diisi.']);
        }
        if (mb_strlen($name) > 60) {
            throw new ValidationException(['display_name' => 'Nama tampilan maksimal 60 karakter.']);
        }
        if (preg_match('/[\x00-\x1F\x7F]/u', $name) === 1) {
            throw new ValidationException(['display_name' => 'Nama tampilan mengandung karakter tidak valid.']);
        }
        return $name;
    }

    public static function bio(mixed $value): ?string
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }
        $bio = trim($value);
        return mb_strlen($bio) > 280 ? mb_substr($bio, 0, 280) : $bio;
    }

    /** Avatar is an identifier from a fixed allow-list, never a URL/upload. */
    public const AVATARS = ['terminal', 'shield', 'ghost', 'robot', 'fox', 'owl', 'key', 'bug'];

    /** @throws ValidationException */
    public static function avatar(mixed $value): string
    {
        $avatar = is_string($value) ? trim($value) : 'terminal';
        if (!in_array($avatar, self::AVATARS, true)) {
            throw new ValidationException(['avatar' => 'Pilihan avatar tidak valid.']);
        }
        return $avatar;
    }

    public const THEMES = ['cyber-dark'];
    public const LANGUAGES = ['id', 'en'];

    /** Clamp a hint count from a request into the only legal range 0..3. */
    public static function hintsUsed(mixed $value): int
    {
        $n = is_numeric($value) ? (int)$value : 0;
        return max(0, min(3, $n));
    }
}
