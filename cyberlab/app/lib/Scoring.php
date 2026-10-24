<?php
/* ============================================================================
 * Scoring.php - server mirror of the client's scoring rules
 * ----------------------------------------------------------------------------
 * Constants and formulas are copied from ctf-analyst-academy so the number
 * the browser shows and the number the database stores can never drift:
 *   challenges.js  CTF.DIFFICULTIES (.xp), CTF.BONUS_XP, CTF.HINT_PENALTY,
 *                  CTF.awardedPoints, CTF.levelFromXp, CTF.normalize,
 *                  CTF.checkAnswer, CTF.hashString, CTF.todayKey
 * The server recomputes every award from the catalogue; XP/point totals,
 * user ids or completion flags sent by the browser are ignored everywhere.
 * ==========================================================================*/
declare(strict_types=1);

final class Scoring
{
    /** difficulty => base XP (challenges.js CTF.DIFFICULTIES) */
    public const DIFFICULTY_XP = [
        'Beginner' => 50, 'Easy' => 100, 'Medium' => 200, 'Hard' => 350, 'Expert' => 600,
    ];
    public const BONUS_FIRST_SOLVE = 50;
    public const BONUS_NO_HINT = 25;
    public const BONUS_PERFECT = 100;
    /** hint count => points penalty fraction (index 0..3) */
    public const HINT_PENALTY = [0.0, 0.0, 0.1, 0.25];

    public static function xpFor(string $difficulty): int
    {
        return self::DIFFICULTY_XP[$difficulty] ?? self::DIFFICULTY_XP['Easy'];
    }

    public static function awardedPoints(int $basePoints, int $hintsUsed): int
    {
        $penalty = self::HINT_PENALTY[max(0, min(3, $hintsUsed))];
        return (int)round($basePoints * (1 - $penalty));
    }

    /** @return array{level:int,into:int,needed:int} mirrors CTF.levelFromXp */
    public static function levelFromXp(int $xp): array
    {
        $level = 1;
        $need = 250;
        $rest = $xp;
        while ($rest >= $need) {
            $rest -= $need;
            $level++;
            $need = $level * 250;
        }
        return ['level' => $level, 'into' => $rest, 'needed' => $need];
    }

    /**
     * Compute one solve award exactly as state.js recordSolve does.
     *
     * @param array<string,mixed> $challenge catalogue record
     * @return array{points:int,xp:int,perfect:bool,bonuses:list<array{label:string,xp:int}>}
     */
    public static function award(array $challenge, int $hintsUsed, int $attemptsIncludingThis, bool $isFirstSolveEver): array
    {
        $hintsUsed = max(0, min(3, $hintsUsed));
        $attempts = max(1, $attemptsIncludingThis);
        $perfect = $attempts === 1 && $hintsUsed === 0;
        $points = self::awardedPoints((int)$challenge['points'], $hintsUsed);
        $xp = self::xpFor((string)$challenge['difficulty']);
        $bonuses = [];
        if ($isFirstSolveEver) {
            $xp += self::BONUS_FIRST_SOLVE;
            $bonuses[] = ['label' => 'FIRST SOLVE', 'xp' => self::BONUS_FIRST_SOLVE];
        }
        if ($hintsUsed === 0) {
            $xp += self::BONUS_NO_HINT;
            $bonuses[] = ['label' => 'NO HINT', 'xp' => self::BONUS_NO_HINT];
        }
        if ($perfect) {
            $xp += self::BONUS_PERFECT;
            $bonuses[] = ['label' => 'PERFECT INVESTIGATION', 'xp' => self::BONUS_PERFECT];
        }
        return ['points' => $points, 'xp' => $xp, 'perfect' => $perfect, 'bonuses' => $bonuses];
    }

    /* ---------------------------------------------------- answer checking */
    /** Mirrors CTF.normalize: strip zero-width, whitespace/_/-, quotes; upper. */
    public static function normalize(string $value): string
    {
        $value = str_replace("\u{200B}", '', $value);
        $value = (string)preg_replace('/[\s_\-]+/u', '', $value);
        $value = str_replace(['`', "'", '"'], '', $value);
        return mb_strtoupper($value, 'UTF-8');
    }

    /**
     * Mirrors CTF.checkAnswer for text challenges (the catalogue never
     * exports regex rules - the exporter refuses them). The challenge flag
     * is always also accepted, exactly like the client.
     *
     * @param array<string,mixed> $challenge catalogue record
     */
    public static function checkTextAnswer(array $challenge, string $given): bool
    {
        $answer = $challenge['answer'] ?? [];
        $expects = $answer['expects'] ?? [];
        foreach ((array)$expects as $expected) {
            if (self::matches($answer, (string)$expected, $given)) {
                return true;
            }
        }
        $flag = (string)($challenge['flag'] ?? '');
        return $flag !== '' && self::matches($answer, $flag, $given);
    }

    /** @param array<string,mixed> $rule */
    private static function matches(array $rule, string $expected, string $given): bool
    {
        if (!empty($rule['caseSensitive'])) {
            return trim($given) === trim($expected);
        }
        $a = self::normalize($given);
        $b = self::normalize($expected);
        if ($a === $b) {
            return true;
        }
        return !empty($rule['contains']) && strlen($b) >= 4 && str_contains($a, $b);
    }

    /* ----------------------------------------------------------- daily pick */
    /** FNV-1a 32-bit, mirrors CTF.hashString (unsigned arithmetic). */
    public static function hashString(string $value): int
    {
        $h = 2166136261;
        $len = strlen($value);
        for ($i = 0; $i < $len; $i++) {
            $h ^= ord($value[$i]);
            // Math.imul semantics: low 32 bits of the product.
            $h = (int)(($h * 16777619) & 0xFFFFFFFF);
        }
        return $h;
    }

    /**
     * Server view of "today's daily challenge" for one user, replicating
     * state.js dailyChallenge(): deterministic seed over the ordered ids,
     * preferring the unsolved pool. Used only to stamp is_daily on a solve
     * (badge DAILY_ANALYST); it never grants points by itself.
     *
     * @param list<string> $orderedIds catalogue ids in registration order
     * @param list<string> $solvedIds  ids the user already solved
     */
    public static function dailyChallengeId(array $orderedIds, array $solvedIds, ?string $dateKey = null): ?string
    {
        if ($orderedIds === []) {
            return null;
        }
        $key = $dateKey ?? date('Y-m-d');
        $solved = array_flip($solvedIds);
        $unsolved = array_values(array_filter($orderedIds, static fn(string $id): bool => !isset($solved[$id])));
        $pool = $unsolved !== [] ? $unsolved : $orderedIds;
        $seed = self::hashString('daily:' . $key);
        return $pool[$seed % count($pool)];
    }
}
