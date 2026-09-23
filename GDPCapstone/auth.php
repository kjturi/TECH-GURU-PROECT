<?php
require_once __DIR__ . '/db.php';

function start_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function current_user(): ?array
{
    start_session();

    return $_SESSION['user'] ?? null;
}

// Redirects to the login page when nobody is signed in.
function require_login(): array
{
    $user = current_user();

    if ($user === null) {
        header('Location: login.php');
        exit;
    }

    return $user;
}

const ROLES = ['Admin', 'Technician', 'Auditor'];

// Roles allowed to add, update and delete assets.
const EDITOR_ROLES = ['Admin', 'Technician'];

function has_role(string ...$roles): bool
{
    $user = current_user();

    return $user !== null && in_array($user['role'], $roles, true);
}

function can_edit(): bool
{
    return has_role(...EDITOR_ROLES);
}

function is_admin(): bool
{
    return has_role('Admin');
}

// Like require_login(), but also sends users without one of the given roles back to the dashboard.
function require_role(string ...$roles): array
{
    $user = require_login();

    if (!in_array($user['role'], $roles, true)) {
        header('Location: dashboard.php?error=1&message=' . urlencode('You do not have permission to access that page.'));
        exit;
    }

    return $user;
}

// Returns the logged in user on success, or null when the credentials are wrong.
function attempt_login(string $username, string $password): ?array
{
    $stmt = db()->prepare(
        'SELECT LoginID, Username, Password, Role FROM logincredentials WHERE Username = ?'
    );
    $stmt->execute([$username]);
    $row = $stmt->fetch();

    if ($row === false || !password_verify($password, $row['Password'])) {
        return null;
    }

    start_session();
    session_regenerate_id(true);

    $_SESSION['user'] = [
        'id'       => (int) $row['LoginID'],
        'username' => $row['Username'],
        'role'     => $row['Role'],
    ];

    return $_SESSION['user'];
}

function logout(): void
{
    start_session();
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }

    session_destroy();
}

// Which inventory area the interface is showing: 'assets' or 'sims'.
// The choice persists in the session so every page reflects the same view.
function current_view(): string
{
    start_session();

    if (isset($_GET['view']) && in_array($_GET['view'], ['assets', 'sims'], true)) {
        $_SESSION['view'] = $_GET['view'];
    }

    return $_SESSION['view'] ?? 'assets';
}

function csrf_token(): string
{
    start_session();

    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function csrf_token_valid(?string $token): bool
{
    start_session();

    return is_string($token)
        && !empty($_SESSION['csrf_token'])
        && hash_equals($_SESSION['csrf_token'], $token);
}
