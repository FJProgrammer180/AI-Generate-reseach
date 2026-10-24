<?php
/* ============================================================================
 * api/settings.php - update per-user preferences (theme, language,
 * reduced_motion). Same allow-lists as the profile form; session user only.
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
    (new AuthService($pdo))->updateSettings((int)$user['id'], $body);
    $settings = (new UserRepository($pdo))->settings((int)$user['id']);
    json_out(['ok' => true, 'settings' => [
        'theme' => (string)($settings['theme'] ?? 'cyber-dark'),
        'language' => (string)($settings['language'] ?? 'id'),
        'reducedMotion' => (bool)(int)($settings['reduced_motion'] ?? 0),
    ]]);
} catch (CsrfException $e) {
    json_out(['ok' => false, 'error' => 'csrf', 'message' => $e->getMessage()], 403);
} catch (ValidationException $e) {
    json_out(['ok' => false, 'error' => 'validation', 'errors' => $e->errors], 422);
}
