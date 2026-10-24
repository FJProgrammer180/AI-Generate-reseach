<?php
/* ============================================================================
 * api/progress.php - the account's database state for the workstation.
 * GET only (read-only), session-authenticated, no-store. Returns public
 * account info + server-computed progress + submissions + achievements.
 * It never returns password hashes or other users' data: the user id comes
 * from the authenticated session, and there is no id parameter at all.
 * ==========================================================================*/
declare(strict_types=1);
require dirname(__DIR__, 2) . '/app/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
}
header('Cache-Control: no-store');

$pdo = db();
$user = AuthGuard::requireAuthApi($pdo);
$users = new UserRepository($pdo);
$service = new ChallengeService($pdo, Catalog::shared());

json_out([
    'ok' => true,
    'account' => UserRepository::publicAccount($user, $users->profile((int)$user['id'])),
    'settings' => [
        'theme' => (string)($users->settings((int)$user['id'])['theme'] ?? 'cyber-dark'),
        'language' => (string)($users->settings((int)$user['id'])['language'] ?? 'id'),
        'reducedMotion' => (bool)(int)($users->settings((int)$user['id'])['reduced_motion'] ?? 0),
    ],
    'state' => $service->statePayload((int)$user['id']),
]);
