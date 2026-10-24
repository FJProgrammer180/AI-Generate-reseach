<?php
/* ============================================================================
 * AdminService.php - account administration behind a SERVER-side role check
 * ----------------------------------------------------------------------------
 * The actor's role is read from the database on every call (not trusted from
 * the session copy), so demotion takes effect immediately and a tampered
 * request can never self-promote: role/status changes only run through here,
 * and registration hardcodes role='user'.
 * Guards: an admin cannot deactivate or demote themselves, and the final
 * remaining administrator can never be demoted or deactivated.
 * ==========================================================================*/
declare(strict_types=1);

final class AdminService
{
    private readonly UserRepository $users;

    public function __construct(private readonly PDO $pdo)
    {
        $this->users = new UserRepository($pdo);
    }

    /** @throws AuthException when the actor is not an active administrator */
    public function assertAdmin(int $actorId): array
    {
        $actor = $this->users->findById($actorId);
        if ($actor === null || $actor['role'] !== 'admin' || (int)$actor['is_active'] !== 1) {
            throw new AuthException('Akses ditolak: diperlukan hak administrator.');
        }
        return $actor;
    }

    /** @throws AuthException|ValidationException */
    public function setActive(int $actorId, int $targetId, bool $active): void
    {
        $this->assertAdmin($actorId);
        $target = $this->mustFind($targetId);
        if (!$active) {
            if ($targetId === $actorId) {
                throw new ValidationException(['target' => 'Anda tidak dapat menonaktifkan akun Anda sendiri.']);
            }
            if ($target['role'] === 'admin' && $this->users->countAdmins() <= 1) {
                throw new ValidationException(['target' => 'Administrator terakhir tidak dapat dinonaktifkan.']);
            }
        }
        $this->users->setActive($targetId, $active);
    }

    /** @throws AuthException|ValidationException */
    public function setRole(int $actorId, int $targetId, string $role): void
    {
        $this->assertAdmin($actorId);
        if (!in_array($role, ['user', 'admin'], true)) {
            throw new ValidationException(['role' => 'Role tidak valid.']);
        }
        $target = $this->mustFind($targetId);
        if ($role === 'user' && $target['role'] === 'admin') {
            if ($targetId === $actorId) {
                throw new ValidationException(['target' => 'Anda tidak dapat menurunkan role Anda sendiri.']);
            }
            if ($this->users->countAdmins() <= 1) {
                throw new ValidationException(['target' => 'Administrator terakhir tidak dapat diturunkan.']);
            }
        }
        $this->users->setRole($targetId, $role);
    }

    /** @return array<string,mixed> */
    private function mustFind(int $userId): array
    {
        $user = $this->users->findById($userId);
        if ($user === null) {
            throw new ValidationException(['target' => 'Akun tujuan tidak ditemukan.']);
        }
        return $user;
    }
}
