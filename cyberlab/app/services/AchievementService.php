<?php
/* ============================================================================
 * AchievementService.php - server evaluation of the 22 client badges
 * ----------------------------------------------------------------------------
 * Mirrors state.js CTF.BADGE_RULES against DATABASE facts (solved rows,
 * catalogue categories, daily stamps). GENERATOR_ADEPT is the only rule NOT
 * evaluated here: procedural practice items are generated and graded on the
 * device (their flags exist nowhere else), so that badge stays a local
 * honour - the bridge keeps counting it client-side and says so in the UI.
 * Every other badge becomes a real row in user_achievements.
 * ==========================================================================*/
declare(strict_types=1);

final class AchievementService
{
    /** badge code => [name, description] - same catalogue as CTF.BADGES */
    public const BADGES = [
        'FIRST_BLOOD'        => ['First Blood', 'Solve your very first challenge.'],
        'CRYPTO_KID'         => ['Crypto Kid', 'Solve 5 cryptography challenges.'],
        'NETWORK_SCOUT'      => ['Network Scout', 'Solve 5 networking challenges.'],
        'FORENSIC_DETECTIVE' => ['Forensic Detective', 'Solve 5 digital forensics challenges.'],
        'LINUX_RANGER'       => ['Linux Ranger', 'Solve 5 Linux challenges.'],
        'WEB_ANALYST'        => ['Web Analyst', 'Solve 5 web security labs.'],
        'STEGO_HUNTER'       => ['Stego Hunter', 'Solve 5 steganography challenges.'],
        'CODE_SMITH'         => ['Code Smith', 'Solve 5 programming challenges.'],
        'REVERSE_ADEPT'      => ['Reverse Adept', 'Solve 5 reverse-engineering challenges.'],
        'OSINT_TRACKER'      => ['OSINT Tracker', 'Solve 5 OSINT investigations (fictional data).'],
        'DECODER_RING'       => ['Decoder Ring', 'Solve 5 encoding challenges.'],
        'CASE_FILE_CLOSER'   => ['Case File Closer', 'Finish your first Mystery Archive campaign.'],
        'ARCHIVIST'          => ['Archivist', 'Finish all 5 Mystery Archive campaigns.'],
        'CTF_VETERAN'        => ['CTF Veteran', 'Solve 25 challenges.'],
        'MASTER_ANALYST'     => ['Master Analyst', 'Solve 50 challenges.'],
        'NO_HINT'            => ['No Hint Club', 'Solve 10 challenges without using a hint.'],
        'PERFECTIONIST'      => ['Perfectionist', 'Land 5 perfect investigations (first try, no hint).'],
        'EXPERT_TRACK'       => ['Expert Track', 'Solve 3 EXPERT challenges.'],
        'POLYGLOT'           => ['Polyglot', 'Solve at least one challenge in 8 different categories.'],
        'DAILY_ANALYST'      => ['Daily Analyst', 'Complete 3 daily challenges.'],
        'NIGHT_OWL'          => ['Night Owl', 'Solve 5 challenges between 00:00 and 05:00 (server time).'],
        // GENERATOR_ADEPT is intentionally device-local (see header).
    ];

    private readonly ProgressRepository $progress;

    public function __construct(
        private readonly PDO $pdo,
        private readonly Catalog $catalog
    ) {
        $this->progress = new ProgressRepository($pdo);
    }

    /**
     * Evaluate all rules for one user and persist newly satisfied badges.
     * Call inside the solve transaction so award + badge commit together.
     * @return list<string> newly earned badge codes
     */
    public function evaluate(int $userId, ?string $earnedAt = null): array
    {
        $solved = array_values(array_filter(
            $this->progress->submissions($userId),
            static fn(array $r): bool => $r['status'] === 'solved'
        ));
        $facts = $this->facts($solved);
        $newly = [];
        foreach (self::BADGES as $code => $_meta) {
            if ($this->satisfied($code, $facts)) {
                if ($this->progress->grantAchievement($userId, $code, $earnedAt ?? now_string())) {
                    $newly[] = $code;
                }
            }
        }
        return $newly;
    }

    /**
     * @param list<array<string,mixed>> $solved solved submission rows
     * @return array<string,mixed> aggregated facts the rules read
     */
    private function facts(array $solved): array
    {
        $byCategory = [];
        $categoriesSeen = [];
        $solvedIds = [];
        $noHint = 0;
        $perfect = 0;
        $expert = 0;
        $night = 0;
        $daily = 0;
        foreach ($solved as $row) {
            $id = (string)$row['challenge_id'];
            $solvedIds[$id] = true;
            $challenge = $this->catalog->find($id);
            if ($challenge !== null) {
                $cat = (string)$challenge['category'];
                $byCategory[$cat] = ($byCategory[$cat] ?? 0) + 1;
                $categoriesSeen[$cat] = true;
                if ($challenge['difficulty'] === 'Expert') {
                    $expert++;
                }
            }
            if ((int)$row['hints_used'] === 0) {
                $noHint++;
                if ((int)$row['attempt_count'] <= 1) {
                    $perfect++;
                }
            }
            if ((int)$row['is_daily'] === 1) {
                $daily++;
            }
            $hour = isset($row['solved_at']) ? (int)substr((string)$row['solved_at'], 11, 2) : 12;
            if ($hour >= 0 && $hour < 5) {
                $night++;
            }
        }
        $campaignsDone = 0;
        $campaignTotal = 0;
        foreach ($this->catalog->campaigns() as $meta) {
            $campaignTotal++;
            $stages = $this->catalog->campaignStages((string)$meta['id']);
            $complete = $stages !== [];
            foreach ($stages as $stage) {
                if (!isset($solvedIds[(string)$stage['id']])) {
                    $complete = false;
                    break;
                }
            }
            if ($complete) {
                $campaignsDone++;
            }
        }
        return [
            'total' => count($solved),
            'byCategory' => $byCategory,
            'categoriesSeen' => count($categoriesSeen),
            'noHint' => $noHint,
            'perfect' => $perfect,
            'expert' => $expert,
            'night' => $night,
            'daily' => $daily,
            'campaignsDone' => $campaignsDone,
            'campaignTotal' => $campaignTotal,
        ];
    }

    /** @param array<string,mixed> $f */
    private function satisfied(string $code, array $f): bool
    {
        $cat = static fn(string $name): int => (int)($f['byCategory'][$name] ?? 0);
        return match ($code) {
            'FIRST_BLOOD'        => $f['total'] >= 1,
            'CRYPTO_KID'         => $cat('Cryptography') >= 5,
            'NETWORK_SCOUT'      => $cat('Networking') >= 5,
            'FORENSIC_DETECTIVE' => $cat('Digital Forensics') >= 5,
            'LINUX_RANGER'       => $cat('Linux') >= 5,
            'WEB_ANALYST'        => $cat('Web Security') >= 5,
            'STEGO_HUNTER'       => $cat('Steganography') >= 5,
            'CODE_SMITH'         => $cat('Programming') >= 5,
            'REVERSE_ADEPT'      => $cat('Reverse Engineering') >= 5,
            'OSINT_TRACKER'      => $cat('OSINT') >= 5,
            'DECODER_RING'       => $cat('Encoding') >= 5,
            'CASE_FILE_CLOSER'   => $f['campaignsDone'] >= 1,
            'ARCHIVIST'          => $f['campaignTotal'] > 0 && $f['campaignsDone'] >= $f['campaignTotal'],
            'CTF_VETERAN'        => $f['total'] >= 25,
            'MASTER_ANALYST'     => $f['total'] >= 50,
            'NO_HINT'            => $f['noHint'] >= 10,
            'PERFECTIONIST'      => $f['perfect'] >= 5,
            'EXPERT_TRACK'       => $f['expert'] >= 3,
            'POLYGLOT'           => $f['categoriesSeen'] >= 8,
            'DAILY_ANALYST'      => $f['daily'] >= 3,
            'NIGHT_OWL'          => $f['night'] >= 5,
            default              => false,
        };
    }
}
