<?php
require_once __DIR__ . '/auth.php';

// Already signed in? Go straight to the dashboard.
if (current_user() !== null) {
    header('Location: dashboard.php');
    exit;
}

$error = '';
$username = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if (!csrf_token_valid($_POST['csrf_token'] ?? null)) {
        $error = 'Your session expired. Please try again.';
    } elseif ($username === '' || $password === '') {
        $error = 'Please enter both your username and password.';
    } else {
        try {
            if (attempt_login($username, $password) !== null) {
                header('Location: dashboard.php');
                exit;
            }
            $error = 'Invalid username or password.';
        } catch (PDOException $e) {
            error_log('Login database error: ' . $e->getMessage());
            $error = 'Unable to reach the database. Please try again later.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login &mdash; Inventory</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f0fdf4;
      color: #333;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }

    .login-card {
      width: 100%;
      max-width: 380px;
      background: #fff;
      padding: 32px;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      border-top: 6px solid #10b981;
    }
    .login-card h1 {
      font-size: 1.6rem;
      color: #065f46;
      text-align: center;
      margin-bottom: 6px;
    }
    .login-card .subtitle {
      text-align: center;
      color: #6b7280;
      font-size: 0.9rem;
      margin-bottom: 24px;
    }
    .login-card .logo {
      display: block;
      max-width: 140px;
      width: 100%;
      height: auto;
      margin: 0 auto 16px;
    }

    .field {
      margin-bottom: 16px;
    }
    .field label {
      display: block;
      margin-bottom: 6px;
      font-size: 0.9rem;
      color: #065f46;
      font-weight: 600;
    }
    .field input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #10b981;
      border-radius: 6px;
      font-size: 1rem;
      font-family: inherit;
    }
    .field input:focus {
      outline: none;
      border-color: #065f46;
      box-shadow: 0 0 0 3px #d1fae5;
    }

    button {
      width: 100%;
      padding: 12px;
      margin-top: 8px;
      background: #10b981;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: 0.3s;
    }
    button:hover {
      background: #065f46;
    }

    .error {
      background: #fee2e2;
      color: #991b1b;
      border-left: 6px solid #dc2626;
      padding: 10px 12px;
      border-radius: 6px;
      font-size: 0.9rem;
      margin-bottom: 18px;
    }
  </style>
  <link rel="stylesheet" href="assets/ui.css">
</head>
<body>
  <form class="login-card" method="post" action="login.php" data-validate>
    <img class="logo" src="<?= htmlspecialchars(rawurlencode('8451 BSP logo kundu.jpg'), ENT_QUOTES, 'UTF-8') ?>" alt="BSP Logo">
    <h1>Asset Management Inventory</h1>
    <p class="subtitle">Sign in to access the dashboard</p>

    <?php if ($error !== ''): ?>
      <p class="error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>

    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8') ?>">

    <div class="field">
      <label for="username">Username</label>
      <input type="text" id="username" name="username" autocomplete="username" required
             value="<?= htmlspecialchars($username, ENT_QUOTES, 'UTF-8') ?>" autofocus>
    </div>

    <div class="field">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" autocomplete="current-password" required>
    </div>

    <button type="submit">Login</button>
  </form>
  <script src="assets/ui.js"></script>
</body>
</html>
