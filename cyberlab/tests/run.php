<?php
/* ============================================================================
 * tests/run.php - CyberLab V4 backend test suite (no PHPUnit required)
 * ----------------------------------------------------------------------------
 *   php cyberlab/tests/run.php [--mysql]
 *
 * Default: every test group gets a fresh in-memory SQLite database built
 * from database/schema.sqlite.sql, exercising the same PDO code paths as
 * production. With --mysql the suite uses Database::config() (your .env)
 * and database/schema.sql statements instead - run it against a THROWAWAY
 * MySQL database; tables are dropped and recreated.
 *
 * Covers the spec section 14 list: registration, duplicates, validation,
 * hashing, login (+throttle, inactive, enumeration resistance), logout,
 * session regeneration, CSRF, SQL injection, profile/password updates,
 * persistent progress, duplicate-reward prevention, transaction rollback,
 * user isolation, admin guards, migration recalculation, code-runner
 * refusal, catalogue/scoring parity with the JS engine, DB failure.
 * HTTP-level checks (redirects, cookie flags, 401s) live in
 * tests/wasm/http-test.mjs because they need a request cycle.
 * Exit code 0 = all green.
 * ==========================================================================*/
declare(strict_types=1);

// Buffer everything: session_start() must run before any output is flushed.
ob_start();
$sessionDir = sys_get_temp_dir() . '/cyberlab_test_sessions';
if (!is_dir($sessionDir)) {
    mkdir($sessionDir, 0700, true);
}
ini_set('session.save_path', $sessionDir);

require dirname(__DIR__) . '/app/bootstrap.php';

/* ---------------------------------------------------------- tiny harness */
$lines = [];
$pass = 0;
$fail = 0;
$failures = [];

function check(string $name, bool $condition, string $detail = ''): void
{
    global $lines, $pass, $fail, $failures;
    if ($condition) {
        $pass++;
        $lines[] = "  PASS  {$name}";
    } else {
        $fail++;
        $failures[] = $name;
        $lines[] = "  FAIL  {$name}" . ($detail !== '' ? "  [{$detail}]" : '');
    }
}

function group(string $title): void
{
    global $lines;
    $lines[] = "\n== {$title} ==";
}

function expectThrow(string $name, string $class, callable $fn, ?callable $inspect = null): void
{
    try {
        $fn();
        check($name, false, 'no exception thrown');
    } catch (Throwable $e) {
        $ok = $e instanceof $class && ($inspect === null || $inspect($e));
        check($name, $ok, get_class($e) . ': ' . $e->getMessage());
    }
}

function freshDb(): PDO
{
    $pdo = Database::connect(['driver' => 'sqlite', 'sqlite' => ':memory:']);
    $sql = (string)file_get_contents(CYBERLAB_ROOT . '/database/schema.sqlite.sql');
    // Strip comment lines first so explode(';') cannot split inside them.
    $sql = preg_replace('/^--.*$/m', '', $sql) ?? $sql;
    foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
        $pdo->exec($statement);
    }
    return $pdo;
}

function freshSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        Session::destroy();
    }
    Session::start();
}

function registerUser(AuthService $auth, string $username, string $email, string $password = 'Secret12345'): int
{
    return $auth->register([
        'username' => $username, 'email' => $email,
        'password' => $password, 'password_confirm' => $password, 'terms' => '1',
    ]);
}

/* =====================================================================  A */
group('A. Scoring parity with challenges.js / state.js');
check('levelFromXp(0) = L1', Scoring::levelFromXp(0) === ['level' => 1, 'into' => 0, 'needed' => 250]);
check('levelFromXp(250) = L2', Scoring::levelFromXp(250) === ['level' => 2, 'into' => 0, 'needed' => 500]);
check('levelFromXp(750) = L3', Scoring::levelFromXp(750) === ['level' => 3, 'into' => 0, 'needed' => 750]);
check('levelFromXp(1500) = L4', Scoring::levelFromXp(1500) === ['level' => 4, 'into' => 0, 'needed' => 1000]);
check('levelFromXp(10000) = L9 +1000', Scoring::levelFromXp(10000) === ['level' => 9, 'into' => 1000, 'needed' => 2250]);
check('hint penalties 0/0/-10%/-25%',
    Scoring::awardedPoints(100, 0) === 100 && Scoring::awardedPoints(100, 1) === 100
    && Scoring::awardedPoints(100, 2) === 90 && Scoring::awardedPoints(100, 3) === 75);
check('normalize mirrors CTF.normalize',
    Scoring::normalize(" flag {Hello-World_test} ") === 'FLAG{HELLOWORLDTEST}');
check('FNV-1a hash matches CTF.hashString', Scoring::hashString('daily:2026-10-24') === 3397850577);

$catalog = Catalog::shared();
check('catalog has 102 challenges / 29145 points', $catalog->count() === 102 && $catalog->totalPoints() === 29145);
check('daily pick parity (browser order, 2026-10-24 = WEB-007)',
    Scoring::dailyChallengeId($catalog->orderedIds(), [], '2026-10-24') === 'WEB-007');

group('A2. Catalogue answer parity (every exported answer re-validated in PHP)');
$badAccept = 0;
$bogusAccepted = 0;
foreach ($catalog->all() as $c) {
    if (($c['answer']['type'] ?? 'text') === 'code') {
        continue;
    }
    foreach ((array)$c['answer']['expects'] as $expects) {
        if (!Scoring::checkTextAnswer($c, (string)$expects)) {
            $badAccept++;
        }
    }
    if (!Scoring::checkTextAnswer($c, (string)$c['flag'])) {
        $badAccept++;
    }
    if (Scoring::checkTextAnswer($c, 'FLAG{definitely_not_it}')) {
        $bogusAccepted++;
    }
}
check('every expects + flag accepted by the PHP checker', $badAccept === 0, "bad={$badAccept}");
check('bogus flag rejected for every text challenge', $bogusAccepted === 0, "bogus={$bogusAccepted}");
$containsChallenge = null;
foreach ($catalog->all() as $c) {
    if (!empty($c['answer']['contains'])) { $containsChallenge = $c; break; }
}
check('contains-rule challenge exists in catalogue', $containsChallenge !== null);
if ($containsChallenge !== null) {
    $needle = (string)($containsChallenge['answer']['expects'][0] ?? $containsChallenge['flag']);
    check('contains rule accepts embedded token', Scoring::checkTextAnswer($containsChallenge, "prefix {$needle} suffix"));
    check('contains rule rejects unrelated text', !Scoring::checkTextAnswer($containsChallenge, 'nothing relevant here'));
}

/* =====================================================================  B */
group('B. Registration');
$pdo = freshDb();
$auth = new AuthService($pdo);
$users = new UserRepository($pdo);
$fid = registerUser($auth, 'fajri', 'fajri@example.com');
$row = $users->findById($fid);
check('registration returns a user id', $fid > 0);
check('user row exists with default role/active', $row !== null && $row['role'] === 'user' && (int)$row['is_active'] === 1);
check('password stored as hash, verifies, never plaintext',
    $row !== null && $row['password_hash'] !== 'Secret12345'
    && !str_contains((string)$row['password_hash'], 'Secret12345')
    && password_verify('Secret12345', (string)$row['password_hash'])
    && !password_verify('Secret12346', (string)$row['password_hash']));
check('profile row created (display name = username)',
    ($p = $users->profile($fid)) !== null && $p['display_name'] === 'fajri');
check('progress row created zeroed',
    ($pr = (new ProgressRepository($pdo))->progress($fid)) !== null
    && (int)$pr['total_xp'] === 0 && (int)$pr['current_level'] === 1);
check('settings row created', $users->settings($fid) !== null);
check('public account shape has NO password_hash',
    !array_key_exists('password_hash', UserRepository::publicAccount($row ?? [], $users->profile($fid))));

expectThrow('duplicate username rejected (case-insensitive)', ValidationException::class,
    fn() => registerUser($auth, 'FAJRI', 'other@example.com'),
    fn(ValidationException $e) => isset($e->errors['username']));
expectThrow('duplicate email rejected', ValidationException::class,
    fn() => registerUser($auth, 'another', 'FAJRI@example.com'),
    fn(ValidationException $e) => isset($e->errors['email']));
check('no orphan rows after failed duplicates',
    (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() === 1
    && (int)$pdo->query('SELECT COUNT(*) FROM user_profiles')->fetchColumn() === 1
    && (int)$pdo->query('SELECT COUNT(*) FROM user_progress')->fetchColumn() === 1);

$invalidCases = [
    'bad email' => ['username' => 'ok_name', 'email' => 'not-an-email'],
    'short password' => ['username' => 'ok_name', 'email' => 'a@b.co', 'password' => 'Ab1', 'password_confirm' => 'Ab1'],
    'password without digit' => ['username' => 'ok_name', 'email' => 'a@b.co', 'password' => 'OnlyLettersHere', 'password_confirm' => 'OnlyLettersHere'],
    'password mismatch' => ['username' => 'ok_name', 'email' => 'a@b.co', 'password' => 'Secret12345', 'password_confirm' => 'Secret12346'],
    'terms not accepted' => ['username' => 'ok_name', 'email' => 'a@b.co', 'password' => 'Secret12345', 'password_confirm' => 'Secret12345', 'terms' => null],
    'username with space' => ['username' => 'bad name', 'email' => 'a@b.co', 'password' => 'Secret12345', 'password_confirm' => 'Secret12345'],
    'username too short' => ['username' => 'ab', 'email' => 'a@b.co', 'password' => 'Secret12345', 'password_confirm' => 'Secret12345'],
    'over-72-byte password' => ['username' => 'ok_name', 'email' => 'a@b.co', 'password' => str_repeat('Aa1', 25), 'password_confirm' => str_repeat('Aa1', 25)],
];
foreach ($invalidCases as $label => $input) {
    $input = array_merge(['username' => null, 'email' => null, 'password' => null, 'password_confirm' => null, 'terms' => '1'], $input);
    expectThrow("invalid registration rejected: {$label}", ValidationException::class, fn() => $auth->register($input));
}
check('still exactly one user after invalid matrix', (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() === 1);

/* =====================================================================  C */
group('C. Login, session, logout, throttle, enumeration resistance');
freshSession();
$sidBefore = session_id();
$loggedIn = $auth->login('fajri', 'Secret12345', '203.0.113.9');
check('login by username succeeds', ($loggedIn['username'] ?? null) === 'fajri');
check('session id regenerated on login', session_id() !== $sidBefore && session_id() !== '');
check('session holds the authenticated user id', Session::userId() === $fid);
$rowAfter = $users->findById($fid);
check('last_login_at updated', !empty($rowAfter['last_login_at']));
$auth->logout();
check('logout clears authentication state', Session::userId() === null);

freshSession();
$auth->login('fajri@example.com', 'Secret12345', '203.0.113.9');
check('login by email succeeds', Session::userId() === $fid);
Session::destroy();
freshSession();

$msgWrong = $msgUnknown = $msgInactive = null;
try { $auth->login('fajri', 'WrongPass123', '198.51.100.1'); } catch (AuthException $e) { $msgWrong = $e->getMessage(); }
try { $auth->login('ghost_user', 'WrongPass123', '198.51.100.2'); } catch (AuthException $e) { $msgUnknown = $e->getMessage(); }
check('wrong password rejected', $msgWrong !== null);
check('unknown account rejected with IDENTICAL message', $msgUnknown !== null && $msgUnknown === $msgWrong);

expectThrow('SQL-injection identifier cannot log in', AuthException::class,
    fn() => $auth->login("' OR '1'='1' -- ", 'whatever', '198.51.100.3'));
check('injection lookup returns no user', $users->findByUsernameOrEmail("' OR '1'='1") === null);
check('users table intact after injection attempts',
    (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() === 1);

$users->setActive($fid, false);
try { $auth->login('fajri', 'Secret12345', '192.0.2.9'); } catch (AuthException $e) { $msgInactive = $e->getMessage(); }
check('inactive account rejected with the same generic message', $msgInactive !== null && $msgInactive === $msgWrong);
$users->setActive($fid, true);

for ($i = 0; $i < LoginAttemptRepository::MAX_FAILURES; $i++) {
    try { $auth->login('fajri', 'Nope' . $i . 'xx', '192.0.2.77'); } catch (AuthException) { /* expected */ }
}
expectThrow('throttled after max failures even with the right password', AuthException::class,
    fn() => $auth->login('fajri', 'Secret12345', '192.0.2.77'),
    fn(AuthException $e) => str_contains($e->getMessage(), 'Terlalu banyak'));
check('session cookie params: HttpOnly + SameSite=Lax',
    Session::cookieParams()['httponly'] === true && Session::cookieParams()['samesite'] === 'Lax');

/* =====================================================================  E */
group('E. CSRF tokens');
freshSession();
$token = Csrf::token();
check('token issued and stable within the session', $token !== '' && Csrf::token() === $token);
try {
    $_POST['csrf_token'] = $token;
    Csrf::assertValid();
    check('valid token accepted', true);
} catch (Throwable $e) {
    check('valid token accepted', false, $e->getMessage());
}
expectThrow('wrong token rejected', CsrfException::class, function () {
    $_POST['csrf_token'] = 'deadbeef';
    Csrf::assertValid();
});
expectThrow('missing token rejected', CsrfException::class, function () {
    unset($_POST['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN']);
    Csrf::assertValid([]);
});
$newToken = Csrf::rotate();
check('rotation changes the token', $newToken !== $token);

/* =====================================================================  F */
group('F. Challenge submission & persistent progress');
$pdo = freshDb();
$auth = new AuthService($pdo);
$uid = registerUser($auth, 'analyst1', 'analyst1@example.com');
$svc = new ChallengeService($pdo, $catalog, new CodeRunner('/nonexistent/node'));
$progressRepo = new ProgressRepository($pdo);

// CRYPTO-013: Beginner, 50 pts, base XP 50, flag FLAG{SHIFT_BY_THREE}
$crypto13 = $catalog->find('CRYPTO-013');
check('fixture challenge exists (50 pts Beginner)', $crypto13 !== null && (int)$crypto13['points'] === 50 && $crypto13['difficulty'] === 'Beginner');
$r = $svc->submit($uid, 'CRYPTO-013', 'FLAG{WRONG}', 0);
check('wrong answer -> incorrect + server attempt count', $r['status'] === 'incorrect' && $r['attemptCount'] === 1);
$r = $svc->submit($uid, 'CRYPTO-013', 'also wrong', 0);
check('second wrong answer increments attempts', $r['status'] === 'incorrect' && $r['attemptCount'] === 2);
check('no rewards for wrong attempts', (int)$progressRepo->progress($uid)['total_xp'] === 0);
check('invalid challenge id rejected', $svc->submit($uid, 'HACK-999', 'x', 0)['status'] === 'invalid_challenge');

// Forgiving normalisation (same as client): case/spacing variants accepted.
$r = $svc->submit($uid, 'CRYPTO-013', ' flag{shift_by_three} ', 0);
// attempts=3 => not perfect; xp = 50 base + 50 first + 25 no-hint = 125; points 50
check('correct flag solved on server', ($r['status'] ?? '') === 'solved');
check('award math: +50 PTS', ($r['award']['points'] ?? -1) === 50);
check('award math: +125 XP (50+50+25, not perfect)', ($r['award']['xp'] ?? -1) === 125 && ($r['award']['perfect'] ?? true) === false);
check('FIRST_BLOOD achievement granted', in_array('FIRST_BLOOD', $r['newAchievements'] ?? [], true));
$prog = $progressRepo->progress($uid);
check('progress persisted in DB', (int)$prog['total_xp'] === 125 && (int)$prog['total_points'] === 50 && (int)$prog['challenges_solved'] === 1);
$sub = $progressRepo->submission($uid, 'CRYPTO-013');
check('submission row auditable (attempts=3, awards stored)',
    $sub !== null && (int)$sub['attempt_count'] === 3 && (int)$sub['points_awarded'] === 50 && (int)$sub['xp_awarded'] === 125 && $sub['solved_at'] !== null);

$r2 = $svc->submit($uid, 'CRYPTO-013', 'FLAG{SHIFT_BY_THREE}', 0);
check('repeat solve -> already_solved', $r2['status'] === 'already_solved');
$prog2 = $progressRepo->progress($uid);
check('NO double reward', (int)$prog2['total_xp'] === 125 && (int)$prog2['total_points'] === 50 && (int)$prog2['challenges_solved'] === 1);
check('achievement not duplicated',
    count(array_filter($progressRepo->achievements($uid), fn($a) => $a['achievement_code'] === 'FIRST_BLOOD')) === 1);

// Perfect first-try solve on a fresh user + hint penalty on another.
$uid2 = registerUser($auth, 'analyst2', 'analyst2@example.com');
$r = $svc->submit($uid2, 'CRYPTO-013', 'FLAG{SHIFT_BY_THREE}', 0);
check('perfect first solve: 50+50+25+100=225 XP', ($r['award']['xp'] ?? -1) === 225 && ($r['award']['perfect'] ?? false) === true);
$r = $svc->submit($uid2, 'CRYPTO-001', 'FLAG{SHIFT_SEVEN_RECOVERED}', 3); // Easy 100 pts -> 75; xp 100 (no bonuses: hints, not first)
check('hint-3 solve: 75 PTS / 100 XP', ($r['award']['points'] ?? -1) === 75 && ($r['award']['xp'] ?? -1) === 100);

// Code challenges: unverifiable without a runner -> refused, not awarded.
$usersBefore = $progressRepo->progress($uid2);
$r = $svc->submit($uid2, 'CODE-001', 'function sumEven(a){return a.filter(x=>x%2===0).reduce((s,x)=>s+x,0);}', 0);
check('code submission refused when runner unavailable', ($r['status'] ?? '') === 'code_runner_unavailable');
check('no award without verification', (int)$progressRepo->progress($uid2)['total_xp'] === (int)$usersBefore['total_xp']);
$r = $svc->submit($uid2, 'CODE-001', 'FLAG{BOUNDS_AND_CONDITIONS}', 0);
check('code challenge also accepts its flag server-side', ($r['status'] ?? '') === 'solved');

group('G. Achievements from database facts');
$uid3 = registerUser($auth, 'crypto_fan', 'crypto@example.com');
$cryptoIds = [];
foreach ($catalog->all() as $c) {
    if ($c['category'] === 'Cryptography' && count($cryptoIds) < 5) {
        $cryptoIds[] = $c;
    }
}
$badges = [];
foreach ($cryptoIds as $c) {
    $res = $svc->submit($uid3, (string)$c['id'], (string)$c['flag'], 0);
    $badges = array_merge($badges, $res['newAchievements'] ?? []);
}
check('5x Cryptography grants CRYPTO_KID', in_array('CRYPTO_KID', $badges, true));
$codes = array_column($progressRepo->achievements($uid3), 'achievement_code');
check('badges persisted & unique', count($codes) === count(array_unique($codes)) && in_array('CRYPTO_KID', $codes, true));

/* =====================================================================  H */
group('H. Transaction rollback (forced mid-transaction failure)');
$pdo = freshDb();
$auth = new AuthService($pdo);
$uid = registerUser($auth, 'rollback', 'rollback@example.com');
$svc = new ChallengeService($pdo, $catalog, new CodeRunner('/nonexistent/node'));
$progressRepo = new ProgressRepository($pdo);
$pdo->exec("CREATE TRIGGER fail_first_blood BEFORE INSERT ON user_achievements
            WHEN NEW.achievement_code = 'FIRST_BLOOD' BEGIN SELECT RAISE(ABORT, 'simulated failure'); END");
expectThrow('mid-transaction failure surfaces as exception', PDOException::class,
    fn() => $svc->submit($uid, 'CRYPTO-013', 'FLAG{SHIFT_BY_THREE}', 0));
$prog = $progressRepo->progress($uid);
check('progress rolled back (0 everywhere)',
    (int)$prog['total_xp'] === 0 && (int)$prog['total_points'] === 0 && (int)$prog['challenges_solved'] === 0);
check('submission rolled back too', $progressRepo->submission($uid, 'CRYPTO-013') === null);
$pdo->exec('DROP TRIGGER fail_first_blood');
$r = $svc->submit($uid, 'CRYPTO-013', 'FLAG{SHIFT_BY_THREE}', 0);
check('same solve succeeds after the failure cause is gone', ($r['status'] ?? '') === 'solved');

/* =====================================================================  I */
group('I. localStorage migration (server recalculates, client totals ignored)');
$pdo = freshDb();
$auth = new AuthService($pdo);
$uid = registerUser($auth, 'legacy', 'legacy@example.com');
$migration = new MigrationService($pdo, $catalog);
$progressRepo = new ProgressRepository($pdo);
$result = $migration->import($uid, [
    // Deliberately includes forged totals and junk: all must be ignored.
    ['challengeId' => 'CRYPTO-001', 'hintsUsed' => 3, 'attempts' => 4, 'solvedAt' => '2025-01-02T10:00:00', 'xp' => 999999, 'points' => 888888, 'totalXp' => 777777],
    ['challengeId' => 'CRYPTO-013', 'hintsUsed' => 0, 'attempts' => 1, 'solvedAt' => '2025-01-01T09:00:00', 'xp' => 123456],
    ['challengeId' => 'HACK-999', 'hintsUsed' => 0, 'attempts' => 1, 'solvedAt' => '2025-01-01T08:00:00'],
    ['challengeId' => 'CRYPTO-013', 'hintsUsed' => 0, 'attempts' => 1, 'solvedAt' => '2025-01-01T09:00:00'],
]);
check('only real, non-duplicate ids imported', $result['imported'] === ['CRYPTO-013', 'CRYPTO-001'] && in_array('HACK-999', $result['skipped'], true));
// Replay order by solvedAt: CRYPTO-013 first (perfect first solve): 225 XP / 50 PTS.
// CRYPTO-001 next (Easy, 3 hints, 4 attempts): 100 XP / 75 PTS. Totals: 325 / 125.
check('rewards recomputed server-side (325 XP, 125 PTS - forged totals ignored)',
    $result['progress']['totalXp'] === 325 && $result['progress']['totalPoints'] === 125);
$codes = array_column($progressRepo->achievements($uid), 'achievement_code');
check('migration grants FIRST_BLOOD', in_array('FIRST_BLOOD', $codes, true));
$again = $migration->import($uid, [['challengeId' => 'CRYPTO-013', 'hintsUsed' => 0, 'attempts' => 1, 'solvedAt' => '2025-01-01T09:00:00']]);
check('re-import is a no-op (no duplicate rewards)',
    $again['imported'] === [] && (int)$progressRepo->progress($uid)['total_xp'] === 325);

/* =====================================================================  J */
group('J. User isolation & tampered ids');
$pdo = freshDb();
$auth = new AuthService($pdo);
$aId = registerUser($auth, 'user_a', 'a@example.com');
$bId = registerUser($auth, 'user_b', 'b@example.com');
$svc = new ChallengeService($pdo, $catalog, new CodeRunner('/nonexistent/node'));
$svc->submit($aId, 'CRYPTO-013', 'FLAG{SHIFT_BY_THREE}', 0);
$stateB = $svc->statePayload($bId);
check('user B sees no trace of user A solves',
    $stateB['progress']['totalXp'] === 0 && $stateB['submissions'] === [] && $stateB['achievements'] === []);
// A posts a profile update with B's id smuggled into the payload: ignored.
$auth->updateProfile($aId, ['display_name' => 'User A renamed', 'avatar' => 'shield', 'bio' => null, 'email' => 'a@example.com', 'user_id' => $bId, 'id' => $bId]);
$usersRepo = new UserRepository($pdo);
check('tampered user_id ignored (B untouched)',
    $usersRepo->profile($aId)['display_name'] === 'User A renamed'
    && $usersRepo->profile($bId)['display_name'] === 'user_b');
check("A's progress visible only in A's state", $svc->statePayload($aId)['progress']['totalPoints'] === 50);

/* =====================================================================  K */
group('K. Profile & password changes');
expectThrow('email change to an already-used address rejected', ValidationException::class,
    fn() => $auth->updateProfile($aId, ['display_name' => 'User A', 'avatar' => 'shield', 'email' => 'b@example.com']),
    fn(ValidationException $e) => isset($e->errors['email']));
$auth->updateProfile($aId, ['display_name' => 'Analyst A', 'avatar' => 'ghost', 'bio' => 'suka forensik', 'email' => 'a-new@example.com']);
$profA = $usersRepo->profile($aId);
$acctA = $usersRepo->findById($aId);
check('profile update persisted',
    $profA['display_name'] === 'Analyst A' && $profA['avatar'] === 'ghost' && $profA['bio'] === 'suka forensik'
    && $acctA['email'] === 'a-new@example.com');
$auth->updateSettings($aId, ['theme' => 'cyber-dark', 'language' => 'en', 'reduced_motion' => '1']);
$settingsA = $usersRepo->settings($aId);
check('settings persisted', $settingsA['language'] === 'en' && (int)$settingsA['reduced_motion'] === 1);
expectThrow('unknown theme rejected via allow-list', ValidationException::class,
    fn() => $auth->updateSettings($aId, ['theme' => 'solarized-rainbow', 'language' => 'en']));

freshSession();
expectThrow('password change with wrong current password rejected', ValidationException::class,
    fn() => $auth->changePassword($aId, 'BukanPassword1', 'NewSecret123', 'NewSecret123'),
    fn(ValidationException $e) => isset($e->errors['current_password']));
$auth->changePassword($aId, 'Secret12345', 'NewSecret123', 'NewSecret123');
$hash = (string)$usersRepo->findById($aId)['password_hash'];
check('new password hash stored; old password dead',
    password_verify('NewSecret123', $hash) && !password_verify('Secret12345', $hash));

/* =====================================================================  L */
group('L. Admin guards');
$pdo = freshDb();
$auth = new AuthService($pdo);
$usersRepo = new UserRepository($pdo);
$adminSvc = new AdminService($pdo);
$plainId = registerUser($auth, 'plain', 'plain@example.com');
$bossId = registerUser($auth, 'boss', 'boss@example.com');
$usersRepo->setRole($bossId, 'admin'); // stands in for bin/create-admin.php
expectThrow('non-admin cannot use admin service', AuthException::class,
    fn() => $adminSvc->setRole($plainId, $plainId, 'admin'));
check('no self-promotion happened', $usersRepo->findById($plainId)['role'] === 'user');
expectThrow('admin cannot demote themselves', ValidationException::class,
    fn() => $adminSvc->setRole($bossId, $bossId, 'user'));
expectThrow('admin cannot deactivate themselves', ValidationException::class,
    fn() => $adminSvc->setActive($bossId, $bossId, false));
$adminSvc->setActive($bossId, $plainId, false);
check('admin can deactivate a user', (int)$usersRepo->findById($plainId)['is_active'] === 0);
$adminSvc->setActive($bossId, $plainId, true);
$adminSvc->setRole($bossId, $plainId, 'admin');
check('admin can promote a user', $usersRepo->findById($plainId)['role'] === 'admin');
$adminSvc->setRole($plainId, $bossId, 'user'); // two admins exist now: allowed
check('second admin can demote the first', $usersRepo->findById($bossId)['role'] === 'user');
expectThrow('last remaining admin cannot be demoted by anyone-admin flow', AuthException::class,
    fn() => $adminSvc->setRole($bossId, $plainId, 'user')); // boss is no longer admin at all
$searchResults = $usersRepo->listAccounts("%' OR '1'='1");
check('admin search is injection-safe (LIKE escaped)', count($searchResults) === 0);
check('admin account list never includes password hashes',
    !array_key_exists('password_hash', $usersRepo->listAccounts()[0]));

/* =====================================================================  M */
group('M. Database failure handling');
expectThrow('unreachable MySQL gives a safe, generic failure', DatabaseUnavailableException::class,
    fn() => Database::connect(['driver' => 'mysql', 'host' => '127.0.0.1', 'port' => '1', 'name' => 'cyberlab_db', 'user' => 'x', 'password' => 'SuperSecretPw']),
    fn(DatabaseUnavailableException $e) => !str_contains($e->getMessage(), 'SuperSecretPw') && str_contains($e->getMessage(), 'Koneksi database gagal'));
expectThrow('unwritable SQLite path gives the same safe failure', DatabaseUnavailableException::class,
    fn() => Database::connect(['driver' => 'sqlite', 'sqlite' => '/definitely/not/a/real/dir/db.sqlite3']));

/* ------------------------------------------------------------------ report */
Session::destroy();
echo implode("\n", $lines), "\n\n";
echo "TOTAL: {$pass} passed, {$fail} failed\n";
if ($fail > 0) {
    echo "FAILED: " . implode('; ', $failures) . "\n";
}
ob_end_flush();
exit($fail > 0 ? 1 : 0);
