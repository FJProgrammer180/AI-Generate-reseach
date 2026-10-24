<?php
/* ============================================================================
 * MigrationService.php - import pre-V4 localStorage progress after login
 * ----------------------------------------------------------------------------
 * The browser offers the learner's locally recorded solve history (ids,
 * hints, attempts, timestamps). The server:
 *   - drops any id that is not in the real server catalogue;
 *   - drops anything already solved in the database (no duplicate rewards);
 *   - IGNORES any xp/points/totals in the payload - they are never read -
 *     and recomputes every award with Scoring inside one transaction,
 *     replaying history in solved-at order so FIRST SOLVE / perfect /
 *     daily stamps land the same way they did locally;
 *   - leaves the local copy untouched (the bridge keeps a backup key until
 *     the learner confirms), so a failed or partial import is recoverable.
 * ==========================================================================*/
declare(strict_types=1);

final class MigrationService
{
    private readonly ProgressRepository $progress;
    private readonly ChallengeService $challenges;

    public function __construct(
        private readonly PDO $pdo,
        private readonly Catalog $catalog
    ) {
        $this->progress = new ProgressRepository($pdo);
        $this->challenges = new ChallengeService($pdo, $catalog);
    }

    /**
     * @param list<array<string,mixed>> $items raw client items
     * @return array{imported:list<string>,skipped:list<string>,progress:array<string,mixed>}
     */
    public function import(int $userId, array $items): array
    {
        $alreadySolved = array_flip($this->progress->solvedIds($userId));
        $accepted = [];
        $skipped = [];
        $seen = [];
        foreach ($items as $item) {
            $id = is_string($item['challengeId'] ?? null) ? $item['challengeId'] : '';
            if ($id === '' || isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            if (!$this->catalog->exists($id) || isset($alreadySolved[$id])) {
                $skipped[] = $id;
                continue;
            }
            $accepted[] = [
                'id' => $id,
                'hints' => Validator::hintsUsed($item['hintsUsed'] ?? 0),
                'attempts' => max(1, min(999, (int)($item['attempts'] ?? 1))),
                'at' => $this->normaliseTimestamp($item['solvedAt'] ?? null),
            ];
        }
        usort($accepted, static fn(array $a, array $b): int => [$a['at'], $a['id']] <=> [$b['at'], $b['id']]);

        $imported = [];
        $this->pdo->beginTransaction();
        try {
            $solvedSoFar = array_keys($alreadySolved);
            foreach ($accepted as $item) {
                $challenge = $this->catalog->find($item['id']);
                if ($challenge === null) {
                    continue; // catalogue changed mid-flight; skip safely
                }
                $this->challenges->applySolve($userId, $challenge, $item['hints'], $item['attempts'], $item['at'], $solvedSoFar);
                $solvedSoFar[] = $item['id'];
                $imported[] = $item['id'];
            }
            $this->pdo->commit();
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }

        return [
            'imported' => $imported,
            'skipped' => $skipped,
            'progress' => $this->challenges->progressPayload($userId),
        ];
    }

    /** Accept ISO-like timestamps; fall back to now for anything unparsable. */
    private function normaliseTimestamp(mixed $value): string
    {
        if (is_string($value)) {
            $ts = strtotime($value);
            if ($ts !== false && $ts > 0) {
                // Never import "future" solves.
                return now_string(min($ts, time()));
            }
        }
        return now_string();
    }
}
