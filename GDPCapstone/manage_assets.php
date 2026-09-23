<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/asset_types.php';

$user = require_login();

$type = asset_type($_GET['type'] ?? DEFAULT_ASSET_TYPE) ?? asset_type(DEFAULT_ASSET_TYPE);
$typeKey   = $type['key_name'];
$table     = $type['table'];
$keyCol    = $type['key'];
$hasSerial = $type['has_serial'];
$selfUrl   = 'manage_assets.php?type=' . urlencode($typeKey);

$message     = $_GET['message'] ?? '';
$messageType = isset($_GET['error']) ? 'error' : 'success';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete') {
    if (!can_edit()) {
        $message     = 'You do not have permission to delete assets.';
        $messageType = 'error';
    } elseif (!csrf_token_valid($_POST['csrf_token'] ?? null)) {
        $message     = 'Your session expired. Please refresh the page and try again.';
        $messageType = 'error';
    } else {
        try {
            $stmt = db()->prepare("DELETE FROM {$table} WHERE {$keyCol} = ?");
            $stmt->execute([$_POST['identifier'] ?? '']);
            header('Location: ' . $selfUrl . '&message=' . urlencode($type['label'] . ' deleted successfully.'));
            exit;
        } catch (PDOException $e) {
            $message     = $e->getCode() === '23000'
                ? 'Cannot delete this asset because another record (e.g. a SIM card) is linked to it.'
                : 'Could not delete asset: ' . $e->getMessage();
            $messageType = 'error';
        }
    }
}

$counts = asset_type_counts(db());
$assets = db()->query(
    "SELECT a.*, o.InvoiceNumber
     FROM {$table} a
     LEFT JOIN orderform o ON o.PO_Number = a.PO_Number
     ORDER BY a.{$keyCol}"
)->fetchAll();

$title = (can_edit() ? 'Manage ' : 'All ') . $type['plural'];
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
    .search-box input {
      padding: 8px 12px;
      border: 1px solid #10b981;
      border-radius: 6px;
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
    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
    }
    .tabs a {
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      padding: 9px 16px;
      border-radius: 8px 8px 0 0;
      border: 1px solid #10b981;
      border-bottom: none;
      color: #065f46;
      background: #fff;
      transition: 0.3s;
    }
    .tabs a:hover {
      background: #d1fae5;
    }
    .tabs a.active {
      background: #10b981;
      color: #fff;
    }
    .tabs a .n {
      display: inline-block;
      margin-left: 6px;
      padding: 1px 7px;
      border-radius: 10px;
      background: rgba(255,255,255,0.35);
      font-size: 0.75rem;
    }
    .tabs a:not(.active) .n {
      background: #d1fae5;
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

    .actions {
      display: flex;
      gap: 8px;
    }
    .actions form {
      display: inline;
    }
    .btn {
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      font-size: 0.85rem;
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
    .btn-outline {
      background: #fff;
      color: #065f46;
      border: 1px solid #10b981;
    }
    .btn-outline:hover {
      background: #d1fae5;
    }
  </style>
  <link rel="stylesheet" href="assets/ui.css">
</head>
<body>
  <?php $sidebarActive = 'manage_assets'; require __DIR__ . '/partials/sidebar.php'; ?>

  <div class="main">
    <div class="topbar">
      <h1><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?></h1>
      <div class="topbar-right">
        <div class="search-box">
          <input type="text" id="searchInput" placeholder="Search <?= htmlspecialchars(strtolower($type['plural']), ENT_QUOTES, 'UTF-8') ?>...">
        </div>
        <div class="user-chip">
          <strong><?= htmlspecialchars($user['username'], ENT_QUOTES, 'UTF-8') ?></strong>
          <?= htmlspecialchars($user['role'], ENT_QUOTES, 'UTF-8') ?>
        </div>
        <a class="logout-link" href="logout.php">Logout</a>
      </div>
    </div>

    <div class="tabs">
      <?php foreach (ASSET_TYPES as $k => $t): ?>
        <a href="manage_assets.php?type=<?= urlencode($k) ?>" class="<?= $k === $typeKey ? 'active' : '' ?>">
          <?= htmlspecialchars($t['plural'], ENT_QUOTES, 'UTF-8') ?><span class="n"><?= (int) $counts[$k] ?></span>
        </a>
      <?php endforeach; ?>
    </div>

    <?php if ($message !== ''): ?>
      <p class="message <?= $messageType ?>"><?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>

    <?php $colCount = 6 + ($hasSerial ? 1 : 0) + (can_edit() ? 1 : 0); ?>
    <table id="assetTable">
      <thead>
        <tr>
          <th>Invoice Number</th>
          <th>PO Number</th>
          <th><?= htmlspecialchars($type['key_label'], ENT_QUOTES, 'UTF-8') ?></th>
          <?php if ($hasSerial): ?><th>Serial Number</th><?php endif; ?>
          <th>Brand</th>
          <th>Model</th>
          <th>Unit Price</th>
          <?php if (can_edit()): ?><th>Actions</th><?php endif; ?>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($assets)): ?>
          <tr><td colspan="<?= $colCount ?>" style="text-align:center;">No <?= htmlspecialchars(strtolower($type['plural']), ENT_QUOTES, 'UTF-8') ?> yet.<?php if (can_edit()): ?> <a href="add_asset.php?type=<?= urlencode($typeKey) ?>">Add the first one</a>.<?php endif; ?></td></tr>
        <?php else: ?>
          <?php foreach ($assets as $asset): ?>
          <tr>
            <td><?= htmlspecialchars($asset['InvoiceNumber'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
            <td><?= htmlspecialchars($asset['PO_Number'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
            <td><?= htmlspecialchars($asset[$keyCol], ENT_QUOTES, 'UTF-8') ?></td>
            <?php if ($hasSerial): ?><td><?= htmlspecialchars($asset['SerialNumber'] ?? '', ENT_QUOTES, 'UTF-8') ?></td><?php endif; ?>
            <td><?= htmlspecialchars($asset['Brand'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
            <td><?= htmlspecialchars($asset['Model'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
            <td><?= $asset['Price'] !== null ? number_format((float) $asset['Price'], 2) : '' ?></td>
            <?php if (can_edit()): ?>
            <td class="actions">
              <a class="btn btn-primary" href="add_asset.php?type=<?= urlencode($typeKey) ?>&edit=<?= urlencode($asset[$keyCol]) ?>">Update</a>
              <a class="btn btn-outline" href="fat_form.php?type=<?= urlencode($typeKey) ?>&id=<?= urlencode($asset[$keyCol]) ?>" target="_blank" rel="noopener" title="Generate Fixed Asset Transfer form">FAT Form</a>
              <form method="post" action="<?= $selfUrl ?>"
                    data-confirm="Delete this <?= htmlspecialchars(strtolower($type['label']), ENT_QUOTES, 'UTF-8') ?>? This cannot be undone."
                    data-confirm-title="Delete <?= htmlspecialchars($type['label'], ENT_QUOTES, 'UTF-8') ?>">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8') ?>">
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="identifier" value="<?= htmlspecialchars($asset[$keyCol], ENT_QUOTES, 'UTF-8') ?>">
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
      let rows = document.querySelectorAll('#assetTable tbody tr');
      rows.forEach(row => {
        let text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
      });
    });
  </script>
</body>
</html>
