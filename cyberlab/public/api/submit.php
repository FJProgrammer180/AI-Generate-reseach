<?php
/* ============================================================================
 * api/submit.php - submit a challenge answer for server validation.
 * Body (JSON): { challengeId, answer, hintsUsed } + X-CSRF-Token header.
 * The server re-checks the answer against the catalogue, recomputes the
 * award, and persists it in one transaction. Any xp/points/user_id/status
 * fields in the body are ignored - they are never even read.
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

$challengeId = $body['challengeId'] ?? null;
$answer = $body['answer'] ?? null;
if (!is_string($challengeId) || $challengeId === '' || strlen($challengeId) > 32 || !is_string($answer)) {
    json_out(['ok' => false, 'error' => 'invalid_request', 'message' => 'challengeId dan answer wajib dikirim.'], 422);
}
if (strlen($answer) > 20000) {
    json_out(['ok' => false, 'error' => 'answer_too_large'], 422);
}

$service = new ChallengeService($pdo, Catalog::shared(), new CodeRunner());
try {
    $result = $service->submit(
        (int)$user['id'],
        $challengeId,
        $answer,
        Validator::hintsUsed($body['hintsUsed'] ?? 0)
    );
} catch (Throwable $e) {
    // Rollback already happened inside the service; report recoverably.
    error_log('[cyberlab] submit failed: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'server_error', 'message' => 'Gagal menyimpan progres. Coba submit kembali.'], 500);
}

match ($result['status']) {
    'invalid_challenge' => json_out(['ok' => false, 'status' => 'invalid_challenge', 'message' => 'Challenge tidak dikenal server.'], 422),
    'code_runner_unavailable' => json_out([
        'ok' => false, 'status' => 'code_runner_unavailable',
        'message' => 'Penilaian server untuk challenge kode sedang tidak tersedia (CODE_RUNNER_NODE belum dikonfigurasi). Poin tidak diberikan tanpa verifikasi.',
    ], 503),
    default => json_out(['ok' => true] + $result),
};
