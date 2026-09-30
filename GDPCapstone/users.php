<?php
require_once __DIR__ . '/auth.php';

$user = require_role('Admin');

$message     = $_GET['message'] ?? '';
$messageType = isset($_GET['error']) ? 'error' : 'success';

$formUsername = '';
$formRole     = 'Auditor';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if (!csrf_token_valid($_POST['csrf_token'] ?? null)) {
        $message     = 'Your session expired. Please refresh the page and try again.';
        $messageType = 'error';
    } elseif ($action === 'add') {
        $formUsername = trim($_POST['username'] ?? '');
        $password     = $_POST['password'] ?? '';
        $formRole     = $_POST['role'] ?? 'Auditor';

        if ($formUsername === '' || $password === '') {
            $message     = 'Username and password are required.';
            $messageType = 'error';
        } elseif (strlen($password) < 8) {
            $message     = 'Password must be at least 8 characters.';
            $messageType = 'error';
        } elseif (!in_array($formRole, ROLES, true)) {
            $message     = 'Invalid role.';
            $messageType = 'error';
        } else {
            try {
                $stmt = db()->prepare('INSERT INTO logincredentials (Username, Password, Role) VALUES (?, ?, ?)');
                $stmt->execute([$formUsername, password_hash($password, PASSWORD_DEFAULT), $formRole]);
                header('Location: users.php?message=' . urlencode("User '{$formUsername}' created."));
                exit;
            } catch (PDOException $e) {
                $message     = $e->getCode() === '23000' ? 'That username is already taken.' : 'Could not create user: ' . $e->getMessage();
                $messageType = 'error';
            }
        }
    } elseif ($action === 'update') {
        $id       = (int) ($_POST['login_id'] ?? 0);
        $role     = $_POST['role'] ?? '';
        $password = $_POST['password'] ?? '';

        if (!in_array($role, ROLES, true)) {
            $message     = 'Invalid role.';
            $messageType = 'error';
        } elseif ($id === $user['id'] && $role !== 'Admin') {
            $message     = 'You cannot remove your own Admin role.';
            $messageType = 'error';
        } elseif ($password !== '' && strlen($password) < 8) {
            $message     = 'New password must be at least 8 characters.';
            $messageType = 'error';
        } else {
            if ($password !== '') {
                $stmt = db()->prepare('UPDATE logincredentials SET Role = ?, Password = ? WHERE LoginID = ?');
                $stmt->execute([$role, password_hash($password, PASSWORD_DEFAULT), $id]);
            } else {
                $stmt = db()->prepare('UPDATE logincredentials SET Role = ? WHERE LoginID = ?');
                $stmt->execute([$role, $id]);
            }
            if ($id === $user['id']) {
                $_SESSION['user']['role'] = $role;
            }
            header('Location: users.php?message=' . urlencode('User updated.'));
            exit;
        }
    } elseif ($action === 'delete') {
        $id = (int) ($_POST['login_id'] ?? 0);

        if ($id === $user['id']) {
            $message     = 'You cannot delete your own account.';
            $messageType = 'error';
        } else {
            $stmt = db()->prepare('DELETE FROM logincredentials WHERE LoginID = ?');
            $stmt->execute([$id]);
            header('Location: users.php?message=' . urlencode('User deleted.'));
            exit;
        }
    }
}

$users = db()->query('SELECT LoginID, Username, Role, CreatedAt FROM logincredentials ORDER BY Username')->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Users &mdash; Inventory</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f0fdf4;
      color: #333;
      display: flex;
    }

    .sidebar {
      width: 220px;
      background: #065f46;
      color: #fff;
      height: 100vh;
      padding: 20px;
      position: fixed;
    }
    .sidebar h2 {
      margin-bottom: 30px;
      font-size: 1.4rem;
      text-align: center;
      color: #d1fae5;
    }
    .sidebar ul {
      list-style: none;
    }
    .sidebar ul li {
      margin: 15px 0;
    }
    .sidebar ul li a {
      color: #a7f3d0;
      text-decoration: none;
      display: block;
      padding: 10px;
      border-radius: 6px;
      transition: 0.3s;
    }
    .sidebar ul li a:hover, .sidebar ul li a.active {
      background: #10b981;
      color: #fff;
    }

    .main {
      margin-left: 240px;
      padding: 20px;
      flex: 1;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .topbar h1 {
      font-size: 1.8rem;
      color: #065f46;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .user-chip {
      font-size: 0.9rem;
      color: #065f46;
    }
    .user-chip strong {
      display: block;
    }
    .logout-link {
      color: #065f46;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      padding: 8px 14px;
      border: 1px solid #10b981;
      border-radius: 6px;
      transition: 0.3s;
    }
    .logout-link:hover {
      background: #10b981;
      color: #fff;
    }

    .message {
      padding: 12px 15px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .message.success {
      background: #d1fae5;
      color: #065f46;
      border-left: 6px solid #10b981;
    }
    .message.error {
      background: #fee2e2;
      color: #991b1b;
      border-left: 6px solid #dc2626;
    }

    .roles-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .role-card {
      background: #fff;
      padding: 16px 20px;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      border-left: 6px solid #10b981;
    }
    .role-card h3 {
      color: #065f46;
      font-size: 1.05rem;
      margin-bottom: 6px;
    }
    .role-card p {
      font-size: 0.9rem;
      color: #6b7280;
    }

    .form-card {
      background: #fff;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .form-card h2 {
      color: #065f46;
      margin-bottom: 18px;
      font-size: 1.2rem;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      align-items: end;
    }
    .field {
      display: flex;
      flex-direction: column;
    }
    .field label {
      font-size: 0.9rem;
      color: #065f46;
      font-weight: 600;
      margin-bottom: 6px;
    }
    input, select {
      padding: 10px 12px;
      border: 1px solid #10b981;
      border-radius: 6px;
      font-size: 1rem;
      font-family: inherit;
      background: #fff;
    }
    input:focus, select:focus {
      outline: none;
      border-color: #065f46;
      box-shadow: 0 0 0 3px #d1fae5;
    }

    .btn {
      padding: 10px 18px;
      border: none;
      border-radius: 6px;
      font-size: 0.95rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: 0.3s;
      text-decoration: none;
      display: inline-block;
    }
    .btn-primary {
      background: #10b981;
      color: #fff;
    }
    .btn-primary:hover {
      background: #065f46;
    }
    .btn-danger {
      background: #ef4444;
      color: #fff;
    }
    .btn-danger:hover {
      background: #991b1b;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    table th, table td {
      padding: 12px 15px;
      text-align: left;
      vertical-align: middle;
    }
    table th {
      background: #10b981;
      color: #fff;
    }
    table tr:nth-child(even) {
      background: #f0fdf4;
    }
    table tr:hover {
      background: #d1fae5;
    }
    table .inline-form {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    table input, table select {
      padding: 6px 10px;
      font-size: 0.9rem;
    }
    table .btn {
      padding: 6px 12px;
      font-size: 0.85rem;
    }
    .you {
      font-size: 0.75rem;
      color: #10b981;
      font-weight: 600;
      margin-left: 6px;
    }
  </style>
  <link rel="stylesheet" href="assets/ui.css">
</head>
<body>
  <?php $sidebarActive = 'users'; require __DIR__ . '/partials/sidebar.php'; ?>

  <div class="main">
    <div class="topbar">
      <h1>User Management</h1>
      <div class="topbar-right">
        <div class="user-chip">
          <strong><?= htmlspecialchars($user['username'], ENT_QUOTES, 'UTF-8') ?></strong>
          <?= htmlspecialchars($user['role'], ENT_QUOTES, 'UTF-8') ?>
        </div>
        <a class="logout-link" href="logout.php">Logout</a>
      </div>
    </div>

    <?php if ($message !== ''): ?>
      <p class="message <?= $messageType ?>"><?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>

    <div class="roles-info">
      <div class="role-card">
        <h3>Admin</h3>
        <p>Full access, including managing user accounts.</p>
      </div>
      <div class="role-card">
        <h3>Technician</h3>
        <p>View, add, update and delete assets.</p>
      </div>
      <div class="role-card">
        <h3>Auditor</h3>
        <p>View-only access to the dashboard and asset lists.</p>
      </div>
    </div>

    <div class="form-card">
      <h2>Add New User</h2>
      <form method="post" action="users.php" data-validate>
        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8') ?>">
        <input type="hidden" name="action" value="add">
        <div class="form-grid">
          <div class="field">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" required maxlength="50" autocomplete="off"
                   value="<?= htmlspecialchars($formUsername, ENT_QUOTES, 'UTF-8') ?>">
          </div>
          <div class="field">
            <label for="password">Password (min 8 chars)</label>
            <input type="password" id="password" name="password" required minlength="8" autocomplete="new-password">
          </div>
          <div class="field">
            <label for="role">Role</label>
            <select id="role" name="role">
              <?php foreach (ROLES as $r): ?>
                <option value="<?= $r ?>" <?= $r === $formRole ? 'selected' : '' ?>><?= $r ?></option>
              <?php endforeach; ?>
            </select>
          </div>
          <div class="field">
            <button type="submit" class="btn btn-primary">Create User</button>
          </div>
        </div>
      </form>
    </div>

    <table>
      <thead>
        <tr>
          <th>Username</th>
          <th>Created</th>
          <th>Role / Reset Password</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($users as $u): $isSelf = (int) $u['LoginID'] === $user['id']; ?>
        <tr>
          <td>
            <?= htmlspecialchars($u['Username'], ENT_QUOTES, 'UTF-8') ?>
            <?php if ($isSelf): ?><span class="you">(you)</span><?php endif; ?>
          </td>
          <td><?= htmlspecialchars(substr($u['CreatedAt'], 0, 10), ENT_QUOTES, 'UTF-8') ?></td>
          <td>
            <form method="post" action="users.php" class="inline-form" data-validate>
              <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8') ?>">
              <input type="hidden" name="action" value="update">
              <input type="hidden" name="login_id" value="<?= (int) $u['LoginID'] ?>">
              <select name="role">
                <?php foreach (ROLES as $r): ?>
                  <option value="<?= $r ?>" <?= $r === $u['Role'] ? 'selected' : '' ?>><?= $r ?></option>
                <?php endforeach; ?>
              </select>
              <input type="password" name="password" placeholder="New password (optional)" minlength="8" autocomplete="new-password">
              <button type="submit" class="btn btn-primary">Save</button>
            </form>
          </td>
          <td>
            <?php if (!$isSelf): ?>
              <form method="post" action="users.php"
                    data-confirm="Delete user <?= htmlspecialchars($u['Username'], ENT_QUOTES, 'UTF-8') ?>? This cannot be undone."
                    data-confirm-title="Delete User">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8') ?>">
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="login_id" value="<?= (int) $u['LoginID'] ?>">
                <button type="submit" class="btn btn-danger">Delete</button>
              </form>
            <?php endif; ?>
          </td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <script src="assets/ui.js"></script>
</body>
</html>
