<?php
/* ============================================================================
 * layout.php - shared page shell for server-rendered pages
 * (login, register, profile, admin). Reuses the existing CyberLab design
 * system: same style.css tokens/classes plus auth.css for form layout, so
 * account pages look native to the workstation, not like a foreign template.
 * ==========================================================================*/
declare(strict_types=1);

/**
 * @param array<string,mixed>|null $account public account shape, if logged in
 */
function render_header(string $title, ?array $account = null): void
{
    echo '<!DOCTYPE html>' . "\n" . '<html lang="id">' . "\n<head>\n";
    echo '<meta charset="utf-8">' . "\n";
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">' . "\n";
    echo '<title>' . e($title) . ' - CyberLab V4</title>' . "\n";
    echo '<link rel="icon" href="favicon.svg" type="image/svg+xml">' . "\n";
    echo '<link rel="shortcut icon" href="favicon.ico">' . "\n";
    echo '<link rel="stylesheet" href="assets/css/style.css">' . "\n";
    echo '<link rel="stylesheet" href="assets/css/auth.css">' . "\n";
    echo "</head>\n<body>\n";
    echo '<header class="topbar"><div class="brand"><div class="brand-mark mono">CTF//</div>'
        . '<div class="brand-text"><div class="brand-name">CYBERLAB V4</div>'
        . '<div class="brand-sub mono">analyst workstation - akun terverifikasi server</div></div></div>';
    echo '<nav class="topbar-tools" aria-label="akun">';
    if ($account !== null) {
        echo '<a class="btn tiny ghost" href="index.php">WORKSTATION</a>';
        echo '<a class="btn tiny ghost" href="profile.php">PROFIL</a>';
        if (($account['role'] ?? '') === 'admin') {
            echo '<a class="btn tiny ghost" href="admin.php">ADMIN</a>';
        }
        echo '<span class="chip cat" title="akun aktif">@' . e($account['username']) . '</span>';
        echo '<form method="post" action="logout.php" class="inline-form">' . Csrf::field()
            . '<button class="btn tiny danger" type="submit">KELUAR</button></form>';
    } else {
        echo '<a class="btn tiny ghost" href="login.php">MASUK</a>';
        echo '<a class="btn tiny primary" href="register.php">DAFTAR</a>';
    }
    echo "</nav></header>\n<main>\n";

    $ok = Session::pullFlash('ok');
    if ($ok !== null) {
        echo '<div class="notice ok" role="status">' . e($ok) . "</div>\n";
    }
    $err = Session::pullFlash('error');
    if ($err !== null) {
        echo '<div class="notice bad" role="alert">' . e($err) . "</div>\n";
    }
}

function render_footer(): void
{
    echo "</main>\n"
        . '<footer class="footer"><p class="footer-note mono">CyberLab V4 - sesi dikelola server (cookie HttpOnly), '
        . 'progres tersimpan di database. Seluruh host, identitas, dan flag di dalam lab bersifat fiktif untuk pelatihan.</p></footer>' . "\n"
        . '<script src="assets/js/auth.js"></script>' . "\n</body>\n</html>\n";
}

/** Inline per-field error text, escaped. */
function field_error(array $errors, string $field): string
{
    return isset($errors[$field]) ? '<div class="field-error" role="alert">' . e($errors[$field]) . '</div>' : '';
}

/** A labelled text-like input. Passwords must never pass $value. */
function form_field(string $label, string $name, string $type, string $value, array $errors, array $attrs = []): void
{
    $extra = '';
    foreach ($attrs as $k => $v) {
        $extra .= ' ' . e($k) . '="' . e($v) . '"';
    }
    echo '<label class="field"><span class="field-label">' . e($label) . '</span>'
        . '<input class="input" type="' . e($type) . '" name="' . e($name) . '" value="' . e($value) . '"' . $extra . '>'
        . field_error($errors, $name) . '</label>' . "\n";
}
