<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/asset_types.php';

$user = require_login();

// Which dashboard panel the header menu selected (persisted across pages).
$view = current_view();

$assets      = [];
$counts      = array_fill_keys(array_keys(ASSET_TYPES), 0);
$totalAssets = 0;
$totalValue  = 0.0;
$sims        = [];
$simStats    = ['total' => 0, 'assigned' => 0, 'unassigned' => 0, 'isps' => 0, 'plans' => 0, 'fees' => 0.0];

try {
    $pdo    = db();
    $counts = asset_type_counts($pdo);

    // One combined list across every asset table, tagged with its type key.
    $parts = [];
    foreach (ASSET_TYPES as $key => $t) {
        $serial  = $t['has_serial'] ? 'a.SerialNumber' : 'NULL';
        $parts[] = "SELECT " . $pdo->quote($key) . " AS TypeKey, a.{$t['key']} AS Identifier, {$serial} AS SerialNumber,
                           a.Brand, a.Model, a.Price, a.PO_Number, o.InvoiceNumber
                    FROM {$t['table']} a
                    LEFT JOIN orderform o ON o.PO_Number = a.PO_Number";
    }
    $assets = $pdo->query(implode("\nUNION ALL\n", $parts) . "\nORDER BY TypeKey, Identifier")->fetchAll();

    $totalAssets = array_sum($counts);
    $totalValue  = array_sum(array_map(fn($a) => (float) ($a['Price'] ?? 0), $assets));

    if ($view === 'sims') {
        $sims = $pdo->query(
            "SELECT s.SPID, s.ISP, s.SIMNumber, s.Plan, s.CUGFee, s.CreditLimit, s.BAN,
                    s.DateActivated, s.IMEINumber, c.Brand, c.Model
             FROM cugsimcards s
             LEFT JOIN cugphones c ON c.IMEINumber = s.IMEINumber
             ORDER BY s.SIMNumber"
        )->fetchAll();

        $simStats['total']      = count($sims);
        $simStats['assigned']   = count(array_filter($sims, fn($s) => trim((string) $s['IMEINumber']) !== ''));
        $simStats['unassigned'] = $simStats['total'] - $simStats['assigned'];
        $simStats['isps']       = count(array_unique(array_filter(array_column($sims, 'ISP'))));
        $simStats['plans']      = count(array_unique(array_filter(array_column($sims, 'Plan'))));
        $simStats['fees']       = array_sum(array_map(fn($s) => (float) ($s['CUGFee'] ?? 0), $sims));
    }
} catch (PDOException $e) {
    error_log('Dashboard query error: ' . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inventory Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f0fdf4;
      color: #333;
      display: flex;
    }

    /* Sidebar */
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

    /* Main content */
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

    /* Header view menu (three vertical dots) */
    .menu-wrap {
      position: relative;
    }
    .dots-btn {
      width: 36px;
      height: 36px;
      border: 1px solid #10b981;
      border-radius: 6px;
      background: #fff;
      color: #065f46;
      font-size: 1.15rem;
      font-weight: bold;
      line-height: 1;
      cursor: pointer;
      transition: 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .dots-btn:hover {
      background: #10b981;
      color: #fff;
    }
    .view-menu {
      display: none;
      position: absolute;
      right: 0;
      top: 44px;
      min-width: 170px;
      background: #fff;
      border: 1px solid #d1fae5;
      border-radius: 8px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.15);
      overflow: hidden;
      z-index: 60;
    }
    .view-menu.open { display: block; }
    .view-menu a {
      display: block;
      padding: 11px 14px;
      text-decoration: none;
      color: #065f46;
      font-size: 0.9rem;
      font-weight: 600;
      border-left: 4px solid transparent;
    }
    .view-menu a:hover { background: #f0fdf4; }
    .view-menu a.active {
      background: #d1fae5;
      border-left-color: #10b981;
    }
    .view-menu .menu-label {
      padding: 8px 14px 4px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: #6b7280;
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
    .add-btn {
      background: #10b981;
      color: #fff;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      padding: 9px 14px;
      border-radius: 6px;
      transition: 0.3s;
    }
    .add-btn:hover {
      background: #065f46;
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
    .edit-btn {
      color: #065f46;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 6px 12px;
      border: 1px solid #10b981;
      border-radius: 6px;
      transition: 0.3s;
    }
    .edit-btn:hover {
      background: #10b981;
      color: #fff;
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

    /* Cards */
    .cards {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    .card {
      background: #fff;
      padding: 18px 20px;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      border-left: 6px solid #10b981;
      transition: transform 0.2s;
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      min-height: 130px;
    }
    .card:hover {
      transform: translateY(-5px);
    }
    .card h3 {
      margin-bottom: 8px;
      font-size: 0.95rem;
      line-height: 1.25;
      color: #065f46;
      min-height: 2.5em;
    }
    .card p {
      font-size: 1.8rem;
      font-weight: bold;
      color: #10b981;
      line-height: 1;
    }
    .card small {
      display: block;
      margin-top: auto;
      padding-top: 10px;
      font-size: 0.78rem;
      color: #6b7280;
    }
    .card-total {
      grid-column: 1 / -1;
      background: #065f46;
      border-left-color: #a7f3d0;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      min-height: 0;
      padding: 16px 24px;
    }
    .card-total h3 {
      min-height: 0;
      margin: 0;
      font-size: 1.05rem;
    }
    .card-total p {
      font-size: 2rem;
    }
    .card-total small {
      margin: 0;
      padding: 0;
      font-size: 0.9rem;
    }
    .card-total h3, .card-total small {
      color: #d1fae5;
    }
    .card-total p {
      color: #fff;
    }
    @media (max-width: 1200px) {
      .cards { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 800px) {
      .cards { grid-template-columns: repeat(2, 1fr); }
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

    /* Table */
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
  </style>
  <link rel="stylesheet" href="assets/ui.css">
</head>
<body>
  <?php $sidebarActive = 'dashboard'; require __DIR__ . '/partials/sidebar.php'; ?>

  <div class="main">
    <div class="topbar">
      <h1><?= $view === 'sims' ? 'CUG SIMs' : 'Dashboard' ?></h1>
      <div class="topbar-right">
        <div class="menu-wrap">
          <button type="button" class="dots-btn" id="viewMenuBtn" aria-haspopup="true" aria-expanded="false" title="Dashboard view">&#8942;</button>
          <div class="view-menu" id="viewMenu">
            <div class="menu-label">Show</div>
            <a href="dashboard.php?view=assets" class="<?= $view === 'assets' ? 'active' : '' ?>">Assets</a>
            <a href="dashboard.php?view=sims" class="<?= $view === 'sims' ? 'active' : '' ?>">CUG SIMs</a>
          </div>
        </div>
        <div class="search-box">
          <input type="text" id="searchInput" placeholder="Search <?= $view === 'sims' ? 'SIMs' : 'assets' ?>...">
        </div>
        <?php if (can_edit() && $view === 'assets'): ?>
          <a class="add-btn" href="add_asset.php">+ Add Asset</a>
        <?php endif; ?>
        <div class="user-chip">
          <strong><?= htmlspecialchars($user['username'], ENT_QUOTES, 'UTF-8') ?></strong>
          <?= htmlspecialchars($user['role'], ENT_QUOTES, 'UTF-8') ?>
        </div>
        <a class="logout-link" href="logout.php">Logout</a>
      </div>
    </div>

    <?php if (isset($_GET['message'])): ?>
      <p class="message <?= isset($_GET['error']) ? 'error' : 'success' ?>"><?= htmlspecialchars($_GET['message'], ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>

    <?php if ($view === 'assets'): ?>
      <div class="cards">
        <div class="card card-total">
          <h3>Total Assets</h3>
          <p><?= $totalAssets ?></p>
          <small>Total value <?= number_format($totalValue, 2) ?></small>
        </div>
        <?php foreach (ASSET_TYPES as $key => $t): ?>
          <a class="card" href="manage_assets.php?type=<?= urlencode($key) ?>">
            <h3><?= htmlspecialchars($t['plural'], ENT_QUOTES, 'UTF-8') ?></h3>
            <p><?= (int) $counts[$key] ?></p>
            <small>View list &rsaquo;</small>
          </a>
        <?php endforeach; ?>
      </div>

      <table id="inventoryTable">
        <thead>
          <tr>
            <th>Type</th>
            <th>Invoice</th>
            <th>PO Number</th>
            <th>IMEI / Serial</th>
            <th>Brand</th>
            <th>Model</th>
            <th>Unit Price</th>
            <?php if (can_edit()): ?><th>Actions</th><?php endif; ?>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($assets)): ?>
            <tr><td colspan="8" style="text-align:center;">No assets yet.<?php if (can_edit()): ?> <a href="add_asset.php">Add your first asset</a>.<?php endif; ?></td></tr>
          <?php else: ?>
            <?php foreach ($assets as $a): $t = ASSET_TYPES[$a['TypeKey']]; ?>
              <tr>
                <td><span class="type-pill"><?= htmlspecialchars($t['label'], ENT_QUOTES, 'UTF-8') ?></span></td>
                <td><?= htmlspecialchars($a['InvoiceNumber'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
                <td><?= htmlspecialchars($a['PO_Number'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
                <td><?= htmlspecialchars($a['Identifier'], ENT_QUOTES, 'UTF-8') ?></td>
                <td><?= htmlspecialchars($a['Brand'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
                <td><?= htmlspecialchars($a['Model'] ?? '', ENT_QUOTES, 'UTF-8') ?></td>
                <td><?= $a['Price'] !== null ? number_format((float) $a['Price'], 2) : '' ?></td>
                <?php if (can_edit()): ?>
                  <td><a class="edit-btn" href="add_asset.php?type=<?= urlencode($a['TypeKey']) ?>&edit=<?= urlencode($a['Identifier']) ?>">Update</a></td>
                <?php endif; ?>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>

    <?php else: /* ================= CUG SIMs view ================= */ ?>
      <div class="cards">
        <div class="card card-total">
          <h3>Total CUG SIMs</h3>
          <p><?= $simStats['total'] ?></p>
          <small>Monthly CUG fees <?= number_format($simStats['fees'], 2) ?></small>
        </div>
        <div class="card">
          <h3>Assigned to a Phone</h3>
          <p><?= $simStats['assigned'] ?></p>
          <small>SIMs linked to a device</small>
        </div>
        <div class="card">
          <h3>Unassigned</h3>
          <p><?= $simStats['unassigned'] ?></p>
          <small>Not linked to any phone</small>
        </div>
        <div class="card">
          <h3>ISPs</h3>
          <p><?= $simStats['isps'] ?></p>
          <small>Service providers in use</small>
        </div>
        <div class="card">
          <h3>Plans</h3>
          <p><?= $simStats['plans'] ?></p>
          <small>Distinct CUG plans</small>
        </div>
      </div>

      <table id="inventoryTable">
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
          </tr>
        </thead>
        <tbody>
          <?php if (empty($sims)): ?>
            <tr><td colspan="9" style="text-align:center;">No CUG SIM cards recorded yet.</td></tr>
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
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    <?php endif; ?>
  </div>

  <script src="assets/ui.js"></script>
  <script>
    // Header view menu (three dots)
    const menuBtn = document.getElementById('viewMenuBtn');
    const viewMenu = document.getElementById('viewMenu');
    menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      const open = viewMenu.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function () {
      viewMenu.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        viewMenu.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.getElementById('searchInput').addEventListener('keyup', function() {
      let filter = this.value.toLowerCase();
      let rows = document.querySelectorAll('#inventoryTable tbody tr');
      rows.forEach(row => {
        let text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
      });
    });
  </script>
</body>
</html>
