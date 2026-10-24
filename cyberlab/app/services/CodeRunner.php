<?php
/* ============================================================================
 * CodeRunner.php - server grading for the two code-graded challenges
 * ----------------------------------------------------------------------------
 * CODE-001 / CODE-002 are graded by a test table, not a flag string. PHP
 * cannot run learner JavaScript, so when CODE_RUNNER_NODE points at a node
 * binary this service pipes {code, tests} to app/services/code-runner.js,
 * which evaluates them in a node:vm context with a hard timeout and no
 * filesystem/network/process capabilities, then returns pass/fail only.
 *
 * When no runner is configured, grade() returns null ("unavailable") and
 * the submission endpoint refuses to award points rather than awarding
 * unverified points. Note vm is a training sandbox, not a hostile-code
 * boundary: run the web tier as an unprivileged user in production.
 * ==========================================================================*/
declare(strict_types=1);

final class CodeRunner
{
    private const TIMEOUT_SECONDS = 4;

    public function __construct(private readonly ?string $nodeBinary = null)
    {
    }

    public function available(): bool
    {
        $node = $this->node();
        return $node !== null && is_executable($node) && function_exists('proc_open');
    }

    /**
     * @param list<array{call:string,expect:mixed}> $tests
     * @return bool|null true=all tests pass, false=any fail, null=unavailable
     */
    public function grade(string $code, array $tests): ?bool
    {
        if (!$this->available() || strlen($code) > 20000) {
            return strlen($code) > 20000 ? false : null;
        }
        $script = __DIR__ . '/code-runner.js';
        $descriptor = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
        try {
            $process = proc_open([(string)$this->node(), $script], $descriptor, $pipes);
        } catch (Throwable) {
            return null;
        }
        if (!is_resource($process)) {
            return null;
        }
        fwrite($pipes[0], json_encode(['code' => $code, 'tests' => $tests], JSON_UNESCAPED_SLASHES));
        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $output = '';
        $deadline = microtime(true) + self::TIMEOUT_SECONDS;
        $running = true;
        while ($running && microtime(true) < $deadline) {
            $output .= (string)stream_get_contents($pipes[1]);
            $status = proc_get_status($process);
            $running = (bool)($status['running'] ?? false);
            if ($running) {
                usleep(20000);
            }
        }
        $output .= (string)stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        if ($running) {
            proc_terminate($process, 9);
        }
        proc_close($process);

        foreach (array_reverse(explode("\n", trim($output))) as $line) {
            $decoded = json_decode(trim($line), true);
            if (is_array($decoded) && array_key_exists('pass', $decoded)) {
                return (bool)$decoded['pass'];
            }
        }
        return null;
    }

    private function node(): ?string
    {
        return $this->nodeBinary ?? env('CODE_RUNNER_NODE');
    }
}
