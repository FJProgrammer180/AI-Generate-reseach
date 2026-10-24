<?php
/* ============================================================================
 * ChallengeService.php - authoritative flag checking and reward accounting
 * ----------------------------------------------------------------------------
 * Trust rules (the whole point of V4):
 *  - the challenge must exist in the server catalogue;
 *  - the answer is re-checked HERE (Scoring / CodeRunner), never taken as
 *    "correct=true" from the browser;
 *  - points, XP, level, attempt counts and daily stamps are recomputed from
 *    the catalogue + database state; any xp/points/user_id in the request
 *    is ignored because it is never even read;
 *  - a solve writes submission + progress + achievements in ONE transaction
 *    and can pay out exactly once (solved rows short-circuit, and
 *    UNIQUE(user_id, challenge_id) backstops concurrent double submits).
 * Known inherent limit, documented for honesty: the shipped offline dataset
 * contains flags client-side (that is how the lab works from file://), and
 * hints are client-side text, so hintsUsed is taken from the client but
 * clamped to 0..3 and applied through the server scoring table. What the
 * server guarantees is accounting integrity: no forged totals, no double
 * awards, no cross-account writes, and every reward is derived here.
 * ==========================================================================*/
declare(strict_types=1);

final class ChallengeService
{
    private readonly ProgressRepository $progress;
    private readonly AchievementService $achievements;

    public function __construct(
        private readonly PDO $pdo,
        private readonly Catalog $catalog,
        private readonly ?CodeRunner $codeRunner = null
    ) {
        $this->progress = new ProgressRepository($pdo);
        $this->achievements = new AchievementService($pdo, $catalog);
    }

    /**
     * Submit an answer for the authenticated user.
     *
     * @return array<string,mixed> one of:
     *   ['status'=>'solved', 'award'=>..., 'progress'=>..., 'newAchievements'=>[...]]
     *   ['status'=>'already_solved', 'progress'=>...]
     *   ['status'=>'incorrect', 'attemptCount'=>int]
     *   ['status'=>'invalid_challenge']
     *   ['status'=>'code_runner_unavailable']
     */
    public function submit(int $userId, string $challengeId, string $answer, int $hintsUsed): array
    {
        $hintsUsed = Validator::hintsUsed($hintsUsed);
        $challenge = $this->catalog->find($challengeId);
        if ($challenge === null) {
            return ['status' => 'invalid_challenge'];
        }

        $existing = $this->progress->submission($userId, $challengeId);
        if ($existing !== null && $existing['status'] === 'solved') {
            return ['status' => 'already_solved', 'progress' => $this->progressPayload($userId)];
        }

        $answerKind = (string)($challenge['answer']['type'] ?? 'text');
        if ($answerKind === 'code') {
            // The challenge flag remains an acceptable submission server-side
            // too (same rule as every other challenge); otherwise the code
            // must pass the test table in the sandbox.
            if (Scoring::checkTextAnswer($challenge, $answer)) {
                $correct = true;
            } else {
                $graded = ($this->codeRunner ?? new CodeRunner())->grade($answer, $challenge['answer']['tests'] ?? []);
                if ($graded === null) {
                    return ['status' => 'code_runner_unavailable'];
                }
                $correct = $graded;
            }
        } else {
            $correct = Scoring::checkTextAnswer($challenge, $answer);
        }

        if (!$correct) {
            $count = $this->progress->recordWrongAttempt($userId, $challengeId, $hintsUsed);
            return ['status' => 'incorrect', 'attemptCount' => $count];
        }

        $this->pdo->beginTransaction();
        try {
            // Re-read inside the transaction: a concurrent submit that won
            // the race turns this one into a no-op instead of a double pay.
            $fresh = $this->progress->submission($userId, $challengeId);
            if ($fresh !== null && $fresh['status'] === 'solved') {
                $this->pdo->rollBack();
                return ['status' => 'already_solved', 'progress' => $this->progressPayload($userId)];
            }
            $result = $this->applySolve(
                $userId,
                $challenge,
                $hintsUsed,
                ((int)($fresh['attempt_count'] ?? 0)) + 1,
                now_string(),
                null
            );
            $this->pdo->commit();
            return $result;
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * The single place a solve is written. MUST be called with a transaction
     * already open. Shared by live submits and the localStorage migration so
     * both paths pay out through identical server-side arithmetic.
     *
     * @param array<string,mixed> $challenge catalogue record
     * @param list<string>|null $solvedIdsOverride solved-set override (migration replays history)
     * @return array<string,mixed> solved payload
     */
    public function applySolve(
        int $userId, array $challenge, int $hintsUsed, int $attemptsIncludingThis,
        string $solvedAt, ?array $solvedIdsOverride
    ): array {
        $hintsUsed = Validator::hintsUsed($hintsUsed);
        $solvedIds = $solvedIdsOverride ?? $this->progress->solvedIds($userId);
        $isFirstEver = $solvedIds === [];
        $award = Scoring::award($challenge, $hintsUsed, $attemptsIncludingThis, $isFirstEver);
        $dailyId = Scoring::dailyChallengeId(
            $this->catalog->orderedIds(), $solvedIds, substr($solvedAt, 0, 10)
        );
        $isDaily = $dailyId === (string)$challenge['id'];

        $before = $this->progress->progress($userId);
        $newXp = (int)($before['total_xp'] ?? 0) + $award['xp'];
        $newLevel = Scoring::levelFromXp($newXp)['level'];

        $this->progress->markSolved(
            $userId, (string)$challenge['id'], max(1, $attemptsIncludingThis), $hintsUsed,
            $award['points'], $award['xp'], $isDaily, $solvedAt
        );
        $this->progress->addAward($userId, $award['xp'], $award['points'], $newLevel);
        $newBadges = $this->achievements->evaluate($userId, $solvedAt);

        return [
            'status' => 'solved',
            'award' => [
                'points' => $award['points'],
                'xp' => $award['xp'],
                'perfect' => $award['perfect'],
                'firstSolve' => $isFirstEver,
                'daily' => $isDaily,
                'bonuses' => $award['bonuses'],
            ],
            'newAchievements' => $newBadges,
            'progress' => $this->progressPayload($userId),
        ];
    }

    /** @return array<string,mixed> aggregate progress in API shape */
    public function progressPayload(int $userId): array
    {
        $row = $this->progress->progress($userId);
        $xp = (int)($row['total_xp'] ?? 0);
        $level = Scoring::levelFromXp($xp);
        return [
            'totalXp' => $xp,
            'totalPoints' => (int)($row['total_points'] ?? 0),
            'currentLevel' => $level['level'],
            'levelInto' => $level['into'],
            'levelNeeded' => $level['needed'],
            'challengesSolved' => (int)($row['challenges_solved'] ?? 0),
        ];
    }

    /**
     * Everything the workstation needs to hydrate from the database:
     * solved records (with server-computed awards), badges, daily stamps,
     * per-category counts and aggregate progress.
     * @return array<string,mixed>
     */
    public function statePayload(int $userId): array
    {
        $submissions = [];
        $byCategory = [];
        $dailyDoneDates = [];
        foreach ($this->progress->submissions($userId) as $row) {
            $challenge = $this->catalog->find((string)$row['challenge_id']);
            $submissions[] = [
                'challengeId' => (string)$row['challenge_id'],
                'status' => (string)$row['status'],
                'attemptCount' => (int)$row['attempt_count'],
                'hintsUsed' => (int)$row['hints_used'],
                'pointsAwarded' => (int)$row['points_awarded'],
                'xpAwarded' => (int)$row['xp_awarded'],
                'perfect' => $row['status'] === 'solved' && (int)$row['attempt_count'] <= 1 && (int)$row['hints_used'] === 0,
                'isDaily' => (bool)(int)$row['is_daily'],
                'solvedAt' => $row['solved_at'],
                'category' => $challenge['category'] ?? null,
                'difficulty' => $challenge['difficulty'] ?? null,
                'title' => $challenge['title'] ?? null,
            ];
            if ($row['status'] === 'solved' && $challenge !== null) {
                $cat = (string)$challenge['category'];
                $byCategory[$cat] = ($byCategory[$cat] ?? 0) + 1;
            }
            if ($row['status'] === 'solved' && (int)$row['is_daily'] === 1 && $row['solved_at']) {
                $dailyDoneDates[] = substr((string)$row['solved_at'], 0, 10);
            }
        }
        return [
            'progress' => $this->progressPayload($userId),
            'submissions' => $submissions,
            'achievements' => array_map(
                static fn(array $a): array => ['code' => (string)$a['achievement_code'], 'earnedAt' => $a['earned_at']],
                $this->progress->achievements($userId)
            ),
            'byCategory' => $byCategory,
            'dailyDoneDates' => array_values(array_unique($dailyDoneDates)),
            'catalogTotal' => $this->catalog->count(),
            'catalogPoints' => $this->catalog->totalPoints(),
        ];
    }
}
