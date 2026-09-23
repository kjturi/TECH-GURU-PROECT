<?php
require_once __DIR__ . '/auth.php';

$user = require_login();

$message     = $_GET['message'] ?? '';
$messageType = isset($_GET['error']) ? 'error' : 'success';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete') {
    if (!can_edit()) {
        $message     = 'You do not have permission to delete SIM cards.';
        $messageType = 'error';
    } elseif (!csrf_token_valid($_POST['csrf_token'] ?? null)) {
        $message     = 'Your session expired. Please refresh the page and try again.';
        $messageType = 'error';
    } else {
        try {
            $stmt = db()->prepare('DELETE FROM cugsimcards WHERE SPID = ?');
            $stmt->execute([$_POST['spid'] ?? '']);
            header('Location: manage_sims.php?message=' . urlencode('SIM card deleted successfully.'));
            exit;
        } catch (PDOException $e) {
            $message     = 'Could not delete SIM card: ' . $e->getMessage();
            $messageType = 'error';
        }
    }
}

$sims = db()->query(
    "SELECT s.*, c.Brand, c.Model
     FROM cugsimcards s
     LEFT JOIN cugphones c ON c.IMEINumber = s.IMEINumber
     ORDER BY s.SIMNumber"
)->fetchAll();

$title = can_edit() ? 'Manage CUG SIMs' : 'All CUG SIMs';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?> &mdash; Inventory</title>
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
    .sidebar ul { list-style: none; }
    .sidebar ul li { margin: 15px 0; }
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
    .search-box input {
      padding: 8px 12px;
      border: 1px solid #10b981;
      border-radius: 6px;
    }
    .user-chip {
      font-size: 0.9rem;
      color: #065f46;
    }
    .user-chip strong { display: block; }
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

    .type-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      background: #d1fae5;
      color: #065f46;
      font-size: 0.8rem;
      font-weight: 600;
      white-space: nowrap;
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
      font-size: 0.92rem;
    }
    table th {
      background: #10b981;
      color: #fff;
    }
    table tr:nth-child(even) { background: #f0fdf4; }
    table tr:hover { background: #d1fae5; }

    .actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .btn {
      font-size: 0.85rem;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid transparent;
      cursor: pointer;
      text-decoration: none;
      transition: 0.3s;
    }
    .btn-primary {
      color: #065f46;
      border-color: #10b981;
      background: #fff;
    }
    .btn-primary:hover {
      background: #10b981;
      color: #fff;
    }
    .btn-danger {
      color: #991b1b;
      border-color: #dc2626;
      background: #fff;
    }
    .btn-danger:hover {
      background: #dc2626;
      color: #fff;
    }
  </style>
  <link rel="stylesheet" href="assets/ui.css">
</head>
<body>
  <?php $sidebarActive = 'manage_sims'; require __DIR__ . '/partials/sidebar.php'; ?>

  <div class="main">
    <div class="topbar">
      <h1><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?></h1>
      <div class="topbar-right">
        <div class="search-box">
          <input type="text" id="searchInput" placeholder="Search SIMs...">
        </div>
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

    <table id="simTable">
      <thead>
        <tr>
          <th>SIM Number</th>
          <th>SPID</th>
          <th>ISP</th>
          <th>Plan</th>
          <th>CUG Fee</th>
          <th>Credit Limit</th>
          <th>BAN</th>
          <th>Activated</th>
          <th>Linked Phone</th>
          <?php if (can_edit()): ?><th>Actions</th><?php endif; ?>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($sims)): ?>
          <tr><td colspan="<?= can_edit() ? 10 : 9 ?>" style="text-align:center;">No CUG SIM cards recorded yet.<?php if (can_edit()): ?> <a href="add_sim.php">Add the first SIM</a>.<?php endif; ?></td></tr>
        <?php else: ?>
          <?php foreach ($sims as $s): ?>
            <tr>
              <td><?= htmlspecialchars($s['SIMNumber'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
              <td><?= htmlspecialchars($s['SPID'], ENT_QUOTES, 'UTF-8') ?></td>
              <td><?= htmlspecialchars($s['ISP'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
              <td><?= htmlspecialchars($s['Plan'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
              <td><?= $s['CUGFee'] !== null ? number_format((float) $s['CUGFee'], 2) : '' ?></td>
              <td><?= $s['CreditLimit'] !== null ? number_format((float) $s['CreditLimit'], 2) : '' ?></td>
              <td><?= htmlspecialchars($s['BAN'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
              <td><?= htmlspecialchars($s['DateActivated'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
              <td>
                <?php if (trim((string) $s['IMEINumber']) !== ''): ?>
                  <?= htmlspecialchars($s['IMEINumber'], ENT_QUOTES, 'UTF-8') ?>
                  <?php if ($s['Brand'] !== null): ?>
                    <small style="color:#6b7280;">&mdash; <?= htmlspecialchars(trim($s['Brand'] . ' ' . $s['Model']), ENT_QUOTES, 'UTF-8') ?></small>
                  <?php endif; ?>
                <?php else: ?>
                  <span class="type-pill">Unassigned</span>
                <?php endif; ?>
              </td>
              <?php if (can_edit()): ?>
              <td class="actions">
                <a class="btn btn-primary" href="add_sim.php?edit=<?= urlencode($s['SPID']) ?>">Update</a>
                <form method="post" action="manage_sims.php"
                      data-confirm="Delete SIM <?= htmlspecialchars($s['SIMNumber'] ?? $s['SPID'], ENT_QUOTES, 'UTF-8') ?>? This cannot be undone."
                      data-confirm-title="Delete SIM">
                  <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8') ?>">
                  <input type="hidden" name="action" value="delete">
                  <input type="hidden" name="spid" value="<?= htmlspecialchars($s['SPID'], ENT_QUOTES, 'UTF-8') ?>">
                  <button type="submit" class="btn btn-danger">Delete</button>
                </form>
              </td>
              <?php endif; ?>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>

  <script src="assets/ui.js"></script>
  <script>
    document.getElementById('searchInput').addEventListener('keyup', function() {
      let filter = this.value.toLowerCase();
      let rows = document.querySelectorAll('#simTable tbody tr');
      rows.forEach(row => {
        let text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
      });
    });
  </script>
</body>
</html>
