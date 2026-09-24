<?php
/**
 * Creates or resets a user in `logincredentials` with a bcrypt hashed password.
 * Run it from the command line (it refuses to run over HTTP):
 *
 *   C:\xampp\php\php.exe seed_admin.php <username> <password> [Admin|Technician|Auditor]
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script can only be run from the command line.\n");
}

require_once __DIR__ . '/db.php';

$username = $argv[1] ?? null;
$password = $argv[2] ?? null;
$role     = $argv[3] ?? 'Admin';

if ($username === null || $password === null) {
    exit("Usage: php seed_admin.php <username> <password> [Admin|Technician|Auditor]\n");
}

if (!in_array($role, ['Admin', 'Technician', 'Auditor'], true)) {
    exit("Role must be one of: Admin, Technician, Auditor\n");
}

$stmt = db()->prepare(
    'INSERT INTO logincredentials (Username, Password, Role) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE Password = VALUES(Password), Role = VALUES(Role)'
);
$stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT), $role]);

echo "Saved user '{$username}' with role '{$role}'.\n";
