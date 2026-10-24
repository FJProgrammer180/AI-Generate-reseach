<?php
/* ============================================================================
 * api/migrate.php - import pre-V4 localStorage progress into the account.
 * Body (JSON): { items: [{ challengeId, hintsUsed, attempts, solvedAt }] }
 * Client totals are ignored end-to-end: MigrationService validates ids
 * against the server catalogue and recomputes every reward itself.
 * ==========================================================================*/
declare(strict_types=1);
require dirname(__DIR__, 2) . '/app/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

$pdo = db();
$user = AuthGuard::requireAuthApi($pdo);
$body = json_in();

try {
    Csrf::assertValid($body);
} catch (CsrfException $e) {
    json_out(['ok' => false, 'error' => 'csrf', 'message' => $e->getMessage()], 403);
}

$items = $body['items'] ?? null;
if (!is_array($items)) {
    json_out(['ok' => false, 'error' => 'invalid_request', 'message' => 'items wajib berupa daftar.'], 422);
}
if (count($items) > 500) {
    json_out(['ok' => false, 'error' => 'too_many_items'], 422);
}
$normalised = [];
foreach ($items as $item) {
    if (is_array($item)) {
        $normalised[] = $item;
    }
}

try {
    $result = (new MigrationService($pdo, Catalog::shared()))->import((int)$user['id'], $normalised);
    json_out(['ok' => true] + $result);
} catch (Throwable $e) {
    error_log('[cyberlab] migration failed: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'server_error', 'message' => 'Impor progres gagal dan dibatalkan seluruhnya. Salinan lokal Anda tidak diubah.'], 500);
}
