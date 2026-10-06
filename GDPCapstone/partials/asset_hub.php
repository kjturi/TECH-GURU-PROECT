<?php
/** @var array $user   logged-in user (from add_asset.php) */
/** @var array $counts asset counts keyed by type (from add_asset.php) */
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Add Asset &mdash; Inventory</title>
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
      margin-bottom: 8px;
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

    .intro {
      color: #6b7280;
      margin-bottom: 24px;
    }

    .type-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 20px;
    }
    .type-card {
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      border-top: 6px solid #10b981;
      padding: 22px;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .type-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 6px 14px rgba(0,0,0,0.12);
    }
    .type-card .head {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 12px;
    }
    .type-card .icon {
      flex: 0 0 48px;
      height: 48px;
      border-radius: 10px;
      background: #d1fae5;
      color: #065f46;
      font-weight: 700;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      justify-content: center;
      letter-spacing: 0.5px;
    }
    .type-card h3 {
      color: #065f46;
      font-size: 1.15rem;
      line-height: 1.2;
    }
    .type-card .count {
      font-size: 0.8rem;
      color: #10b981;
      font-weight: 600;
    }
    .type-card p {
      color: #6b7280;
      font-size: 0.9rem;
      line-height: 1.5;
      flex: 1;
      margin-bottom: 18px;
    }
    .type-card .actions {
      display: flex;
      gap: 10px;
    }
    .btn {
      flex: 1;
      text-align: center;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      transition: 0.3s;
    }
    .btn-primary {
      background: #10b981;
      color: #fff;
    }
    .btn-primary:hover {
      background: #065f46;
    }
    .btn-secondary {
      background: #fff;
      color: #065f46;
      border: 1px solid #10b981;
    }
    .btn-secondary:hover {
      background: #d1fae5;
    }
  </style>
</head>
<body>
  <?php $sidebarActive = 'add_asset'; require __DIR__ . '/sidebar.php'; ?>

  <div class="main">
    <div class="topbar">
      <h1>Add Asset</h1>
      <div class="topbar-right">
        <div class="user-chip">
          <strong><?= htmlspecialchars($user['username'], ENT_QUOTES, 'UTF-8') ?></strong>
          <?= htmlspecialchars($user['role'], ENT_QUOTES, 'UTF-8') ?>
        </div>
        <a class="logout-link" href="logout.php">Logout</a>
      </div>
    </div>
    <p class="intro">Choose the type of asset you want to record. Every type uses the same form: Invoice, PO Number, identifier, Brand, Model and Unit Price.</p>

    <div class="type-grid">
      <?php foreach (ASSET_TYPES as $key => $t): ?>
        <div class="type-card">
          <div class="head">
            <span class="icon"><?= htmlspecialchars($t['icon'], ENT_QUOTES, 'UTF-8') ?></span>
            <div>
              <h3><?= htmlspecialchars($t['label'], ENT_QUOTES, 'UTF-8') ?></h3>
              <span class="count"><?= (int) ($counts[$key] ?? 0) ?> recorded</span>
            </div>
          </div>
          <p><?= htmlspecialchars($t['description'], ENT_QUOTES, 'UTF-8') ?><br>Identified by <?= htmlspecialchars($t['key_label'], ENT_QUOTES, 'UTF-8') ?>.</p>
          <div class="actions">
            <a class="btn btn-primary" href="add_asset.php?type=<?= urlencode($key) ?>">+ Add</a>
            <a class="btn btn-secondary" href="manage_assets.php?type=<?= urlencode($key) ?>">View list</a>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
</body>
</html>
