<?php
/* ============================================================================
 * ProgressRepository.php - PDO access for progress, submissions, badges
 * All reads are scoped by the authenticated user id handed in by services;
 * there is deliberately no method that accepts a user id from request input.
 * ==========================================================================*/
declare(strict_types=1);

final class ProgressRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @return array<string,mixed>|null */
    public function progress(int $userId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM user_progress WHERE user_id = :id');
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function addAward(int $userId, int $xp, int $points, int $newLevel): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE user_progress
                SET total_xp = total_xp + :xp, total_points = total_points + :pts,
                    challenges_solved = challenges_solved + 1, current_level = :lvl, updated_at = :t
              WHERE user_id = :id'
        );
        $stmt->bindValue('xp', $xp, PDO::PARAM_INT);
        $stmt->bindValue('pts', $points, PDO::PARAM_INT);
        $stmt->bindValue('lvl', $newLevel, PDO::PARAM_INT);
        $stmt->bindValue('t', now_string());
        $stmt->bindValue('id', $userId, PDO::PARAM_INT);
        $stmt->execute();
    }

    /* ---------------------------------------------------------- submissions */
    /** @return array<string,mixed>|null */
    public function submission(int $userId, string $challengeId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM challenge_submissions WHERE user_id = :u AND challenge_id = :c'
        );
        $stmt->execute(['u' => $userId, 'c' => $challengeId]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** @return list<array<string,mixed>> every submission row of this user */
    public function submissions(int $userId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM challenge_submissions WHERE user_id = :u ORDER BY COALESCE(solved_at, created_at), id'
        );
        $stmt->execute(['u' => $userId]);
        return $stmt->fetchAll();
    }

    /** @return list<array<string,mixed>> solved rows, newest first */
    public function recentSolves(int $userId, int $limit = 8): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM challenge_submissions
              WHERE user_id = :u AND status = 'solved'
              ORDER BY solved_at DESC, id DESC LIMIT :n"
        );
        $stmt->bindValue('u', $userId, PDO::PARAM_INT);
        $stmt->bindValue('n', max(1, $limit), PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /** @return list<string> */
    public function solvedIds(int $userId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT challenge_id FROM challenge_submissions WHERE user_id = :u AND status = 'solved' ORDER BY solved_at, id"
        );
        $stmt->execute(['u' => $userId]);
        return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /**
     * Record one wrong attempt (creates the row on first contact). Never
     * touches rewards and never downgrades a solved row.
     * @return int server-side attempt count after this attempt
     */
    public function recordWrongAttempt(int $userId, string $challengeId, int $hintsUsed): int
    {
        $row = $this->submission($userId, $challengeId);
        if ($row === null) {
            $now = now_string();
            try {
                $stmt = $this->pdo->prepare(
                    "INSERT INTO challenge_submissions (user_id, challenge_id, status, attempt_count, hints_used, created_at, updated_at)
                     VALUES (:u, :c, 'attempted', 1, :h, :t, :t2)"
                );
                $stmt->execute(['u' => $userId, 'c' => $challengeId, 'h' => $hintsUsed, 't' => $now, 't2' => $now]);
                return 1;
            } catch (PDOException $e) {
                // A concurrent attempt created the row first (UNIQUE caught
                // the race): fall through and count this attempt on it.
                if ((string)$e->getCode() !== '23000') {
                    throw $e;
                }
                $row = $this->submission($userId, $challengeId);
                if ($row === null) {
                    throw $e;
                }
            }
        }
        if ($row['status'] === 'attempted') {
            $stmt = $this->pdo->prepare(
                'UPDATE challenge_submissions
                    SET attempt_count = attempt_count + 1,
                        hints_used = CASE WHEN hints_used < :h THEN :h2 ELSE hints_used END, updated_at = :t
                  WHERE user_id = :u AND challenge_id = :c'
            );
            $stmt->execute(['h' => $hintsUsed, 'h2' => $hintsUsed, 't' => now_string(), 'u' => $userId, 'c' => $challengeId]);
        }
        $after = $this->submission($userId, $challengeId);
        return (int)($after['attempt_count'] ?? 1);
    }

    /** Insert or flip the row to solved. Caller runs inside a transaction. */
    public function markSolved(
        int $userId, string $challengeId, int $attemptCount, int $hintsUsed,
        int $pointsAwarded, int $xpAwarded, bool $isDaily, string $solvedAt
    ): void {
        $row = $this->submission($userId, $challengeId);
        if ($row === null) {
            $stmt = $this->pdo->prepare(
                "INSERT INTO challenge_submissions
                   (user_id, challenge_id, status, attempt_count, hints_used, points_awarded, xp_awarded, is_daily, solved_at, created_at, updated_at)
                 VALUES (:u, :c, 'solved', :a, :h, :pts, :xp, :daily, :solved, :t, :t2)"
            );
        } else {
            $stmt = $this->pdo->prepare(
                "UPDATE challenge_submissions
                    SET status = 'solved', attempt_count = :a, hints_used = :h, points_awarded = :pts,
                        xp_awarded = :xp, is_daily = :daily, solved_at = :solved, updated_at = :t
                  WHERE user_id = :u AND challenge_id = :c"
            );
        }
        $stmt->bindValue('u', $userId, PDO::PARAM_INT);
        $stmt->bindValue('c', $challengeId);
        $stmt->bindValue('a', $attemptCount, PDO::PARAM_INT);
        $stmt->bindValue('h', $hintsUsed, PDO::PARAM_INT);
        $stmt->bindValue('pts', $pointsAwarded, PDO::PARAM_INT);
        $stmt->bindValue('xp', $xpAwarded, PDO::PARAM_INT);
        $stmt->bindValue('daily', $isDaily ? 1 : 0, PDO::PARAM_INT);
        $stmt->bindValue('solved', $solvedAt);
        $stmt->bindValue('t', now_string());
        if ($row === null) {
            $stmt->bindValue('t2', now_string()); // INSERT carries both timestamps
        }
        $stmt->execute();
    }

    /* ---------------------------------------------------------- achievements */
    /** @return list<array{achievement_code:string,earned_at:string}> */
    public function achievements(int $userId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT achievement_code, earned_at FROM user_achievements WHERE user_id = :u ORDER BY earned_at, id'
        );
        $stmt->execute(['u' => $userId]);
        return $stmt->fetchAll();
    }

    /** Insert if not present. Returns true when newly earned. */
    public function grantAchievement(int $userId, string $code, string $earnedAt): bool
    {
        $check = $this->pdo->prepare(
            'SELECT 1 FROM user_achievements WHERE user_id = :u AND achievement_code = :c'
        );
        $check->execute(['u' => $userId, 'c' => $code]);
        if ($check->fetchColumn() !== false) {
            return false;
        }
        $this->pdo->prepare(
            'INSERT INTO user_achievements (user_id, achievement_code, earned_at) VALUES (:u, :c, :t)'
        )->execute(['u' => $userId, 'c' => $code, 't' => $earnedAt]);
        return true;
    }

    /* ---------------------------------------------------------------- misc */
    public function dailyDoneCount(int $userId): int
    {
        $stmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM challenge_submissions WHERE user_id = :u AND status = 'solved' AND is_daily = 1"
        );
        $stmt->execute(['u' => $userId]);
        return (int)$stmt->fetchColumn();
    }
}
