<?php
/* ============================================================================
 * Catalog.php - the server-side challenge catalogue
 * ----------------------------------------------------------------------------
 * Reads app/data/challenges.json, the file produced by
 * tools/export-catalog.js from the real JS dataset (same ids, points,
 * difficulties, flags and accepted answers as ctf-analyst-academy). This is
 * the authority the backend validates against: an id that is not in here
 * does not exist, and points/XP always derive from here - never from the
 * request body.
 * ==========================================================================*/
declare(strict_types=1);

final class Catalog
{
    /** @var array<string,array<string,mixed>> */
    private array $byId = [];
    /** @var list<array<string,mixed>> registration order (daily-pick parity) */
    private array $ordered = [];
    /** @var list<array<string,mixed>> */
    private array $campaigns = [];

    public function __construct(?string $path = null)
    {
        $path = $path ?? CYBERLAB_APP . '/data/challenges.json';
        $json = is_file($path) ? file_get_contents($path) : false;
        $data = $json !== false ? json_decode($json, true) : null;
        if (!is_array($data) || !isset($data['challenges']) || !is_array($data['challenges'])) {
            throw new RuntimeException('Katalog challenge server tidak dapat dimuat. Jalankan tools/export-catalog.js.');
        }
        foreach ($data['challenges'] as $challenge) {
            $this->byId[(string)$challenge['id']] = $challenge;
            $this->ordered[] = $challenge;
        }
        $this->campaigns = $data['campaigns'] ?? [];
    }

    public static function shared(): self
    {
        static $instance = null;
        return $instance ??= new self();
    }

    /** @return array<string,mixed>|null */
    public function find(string $id): ?array
    {
        return $this->byId[$id] ?? null;
    }

    public function exists(string $id): bool
    {
        return isset($this->byId[$id]);
    }

    /** @return list<array<string,mixed>> */
    public function all(): array
    {
        return $this->ordered;
    }

    /** @return list<string> ordered ids (daily-pick parity with state.js) */
    public function orderedIds(): array
    {
        return array_map(static fn(array $c): string => (string)$c['id'], $this->ordered);
    }

    /** @return list<array<string,mixed>> */
    public function campaigns(): array
    {
        return $this->campaigns;
    }

    /** @return list<array<string,mixed>> */
    public function campaignStages(string $campaignId): array
    {
        return array_values(array_filter(
            $this->ordered,
            static fn(array $c): bool => ($c['campaign'] ?? null) === $campaignId
        ));
    }

    public function count(): int
    {
        return count($this->ordered);
    }

    public function totalPoints(): int
    {
        return array_sum(array_map(static fn(array $c): int => (int)$c['points'], $this->ordered));
    }

    /** @return array<string,int> category => challenge count */
    public function categoryCounts(): array
    {
        $counts = [];
        foreach ($this->ordered as $c) {
            $counts[(string)$c['category']] = ($counts[(string)$c['category']] ?? 0) + 1;
        }
        return $counts;
    }
}
