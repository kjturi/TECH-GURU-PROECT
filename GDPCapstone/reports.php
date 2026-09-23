<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/asset_types.php';

$user = require_login();
$pdo  = db();
$view = current_view();

$palette = ['#10b981', '#065f46', '#34d399', '#047857', '#6ee7b7', '#059669', '#a7f3d0', '#064e3b'];

// Per type: count, total value, brand breakdown, model breakdown, PO breakdown.
$report     = [];
$grandCount = 0;
$grandValue = 0.0;
$maxCount   = 1;
$maxValue   = 1.0;
$segments   = [];

// SIM report data (used when the CUG SIMs view is active).
$simByIsp   = [];
$simByPlan  = [];
$simTotals  = ['total' => 0, 'assigned' => 0, 'unassigned' => 0, 'fees' => 0.0];

if ($view === 'sims') {
    $simRows = $pdo->query(
        "SELECT s.ISP, s.Plan, s.CUGFee, s.IMEINumber
         FROM cugsimcards s"
    )->fetchAll();

    foreach ($simRows as $s) {
        $ispKey  = trim((string) $s['ISP']) !== '' ? trim((string) $s['ISP']) : 'Unspecified';
        $planKey = trim((string) $s['Plan']) !== '' ? trim((string) $s['Plan']) : 'Unspecified';
        $fee     = (float) ($s['CUGFee'] ?? 0);
        $linked  = trim((string) $s['IMEINumber']) !== '';

        $simByIsp[$ispKey]['n']    = ($simByIsp[$ispKey]['n'] ?? 0) + 1;
        $simByIsp[$ispKey]['fees'] = ($simByIsp[$ispKey]['fees'] ?? 0) + $fee;
        $simByPlan[$planKey]['n']    = ($simByPlan[$planKey]['n'] ?? 0) + 1;
        $simByPlan[$planKey]['fees'] = ($simByPlan[$planKey]['fees'] ?? 0) + $fee;

        $simTotals['total']++;
        $simTotals[$linked ? 'assigned' : 'unassigned']++;
        $simTotals['fees'] += $fee;
    }

    uasort($simByIsp, fn($a, $b) => $b['n'] <=> $a['n']);
    uasort($simByPlan, fn($a, $b) => $b['n'] <=> $a['n']);
    $maxCount = max(1, ...array_column($simByIsp ?: ['x' => ['n' => 0]], 'n'), ...array_column($simByPlan ?: ['x' => ['n' => 0]], 'n'));
    $maxValue = max(1.0, ...array_column($simByPlan ?: ['x' => ['fees' => 0]], 'fees'));
} else {
foreach (ASSET_TYPES as $key => $t) {
    $tbl = $t['table'];

    $summary = $pdo->query("SELECT COUNT(*) AS n, COALESCE(SUM(Price), 0) AS v FROM {$tbl}")->fetch();
    $brands  = $pdo->query("SELECT COALESCE(NULLIF(TRIM(Brand), ''), 'Unspecified') AS label, COUNT(*) AS n
                            FROM {$tbl} GROUP BY label ORDER BY n DESC, label")->fetchAll();
    $models  = $pdo->query("SELECT CONCAT(COALESCE(NULLIF(TRIM(Brand), ''), 'Unspecified'), ' ', COALESCE(NULLIF(TRIM(Model), ''), '')) AS label, COUNT(*) AS n
                            FROM {$tbl} GROUP BY label ORDER BY n DESC, label LIMIT 8")->fetchAll();
    $pos     = $pdo->query("SELECT COALESCE(a.PO_Number, 'No PO') AS label, o.InvoiceNumber, COUNT(*) AS n, COALESCE(SUM(a.Price), 0) AS v
                            FROM {$tbl} a LEFT JOIN orderform o ON o.PO_Number = a.PO_Number
                            GROUP BY a.PO_Number, o.InvoiceNumber ORDER BY n DESC, label LIMIT 8")->fetchAll();

    $report[$key] = [
        'count'  => (int) $summary['n'],
        'value'  => (float) $summary['v'],
        'brands' => $brands,
        'models' => $models,
        'pos'    => $pos,
    ];
    $grandCount += (int) $summary['n'];
    $grandValue += (float) $summary['v'];
}

$maxCount = max(1, ...array_column($report, 'count'));
$maxValue = max(1.0, ...array_column($report, 'value'));

// Donut chart segments (SVG stroke-dasharray around a circle of circumference 100).
$offset   = 0;
$i        = 0;
foreach ($report as $key => $r) {
    $pct        = $grandCount > 0 ? $r['count'] / $grandCount * 100 : 0;
    $segments[] = ['key' => $key, 'pct' => $pct, 'offset' => $offset, 'color' => $palette[$i % count($palette)]];
    $offset    += $pct;
    $i++;
}
}

function h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= $view === 'sims' ? 'CUG SIM Reports' : 'Asset Reports' ?> &mdash; Inventory</title>
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
    .user-chip {
      font-size: 0.9rem;
      color: #065f46;
    }
    .user-chip strong { display: block; }
    .logout-link, .print-btn {
      color: #065f46;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      padding: 8px 14px;
      border: 1px solid #10b981;
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      font-family: inherit;
      transition: 0.3s;
    }
    .logout-link:hover, .print-btn:hover {
      background: #10b981;
      color: #fff;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat {
      background: #fff;
      padding: 18px 20px;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      border-left: 6px solid #10b981;
    }
    .stat h3 {
      font-size: 0.95rem;
      color: #065f46;
      margin-bottom: 6px;
    }
    .stat p {
      font-size: 1.6rem;
      font-weight: bold;
      color: #10b981;
    }
    .stat.dark {
      background: #065f46;
      border-left-color: #a7f3d0;
    }
    .stat.dark h3 { color: #d1fae5; }
    .stat.dark p { color: #fff; }

    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    .panel {
      background: #fff;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    .panel h2 {
      font-size: 1.1rem;
      color: #065f46;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 2px solid #d1fae5;
    }
    .panel h4 {
      font-size: 0.9rem;
      color: #065f46;
      margin: 14px 0 8px;
    }
    .empty {
      color: #6b7280;
      font-size: 0.9rem;
      padding: 12px 0;
    }

    /* Vertical bar chart */
    .vbars {
      display: flex;
      align-items: flex-end;
      gap: 14px;
      height: 220px;
      padding: 0 6px;
      border-bottom: 2px solid #d1fae5;
    }
    .vbar {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      height: 100%;
    }
    .vbar .val {
      font-size: 0.85rem;
      font-weight: 700;
      color: #065f46;
      margin-bottom: 4px;
    }
    .vbar .bar {
      width: 100%;
      max-width: 64px;
      background: #10b981;
      border-radius: 6px 6px 0 0;
      transition: height 0.4s;
      min-height: 2px;
    }
    .vbar-labels {
      display: flex;
      gap: 14px;
      padding: 8px 6px 0;
    }
    .vbar-labels span {
      flex: 1;
      text-align: center;
      font-size: 0.75rem;
      color: #6b7280;
      line-height: 1.3;
    }

    /* Horizontal bar chart */
    .hbars { display: grid; gap: 8px; }
    .hbar {
      display: grid;
      grid-template-columns: minmax(110px, 32%) 1fr auto;
      align-items: center;
      gap: 10px;
      font-size: 0.85rem;
    }
    .hbar .lbl {
      color: #374151;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .hbar .track {
      background: #f0fdf4;
      border-radius: 6px;
      height: 16px;
      overflow: hidden;
    }
    .hbar .fill {
      height: 100%;
      background: #10b981;
      border-radius: 6px;
    }
    .hbar .n {
      font-weight: 700;
      color: #065f46;
      min-width: 28px;
      text-align: right;
    }
    .hbar .sub {
      display: block;
      font-size: 0.72rem;
      color: #9ca3af;
    }

    /* Donut */
    .donut-wrap {
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }
    .donut {
      width: 180px;
      height: 180px;
      flex: 0 0 180px;
    }
    .donut .center {
      font-size: 7px;
      font-weight: 700;
      fill: #065f46;
    }
    .legend { display: grid; gap: 8px; flex: 1; min-width: 160px; }
    .legend div {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
    }
    .legend i {
      width: 12px;
      height: 12px;
      border-radius: 3px;
      display: inline-block;
    }
    .legend b { margin-left: auto; color: #065f46; }

    .type-section {
      margin-bottom: 24px;
    }
    .type-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .type-head h2 {
      font-size: 1.25rem;
      color: #065f46;
    }
    .type-head .meta {
      font-size: 0.9rem;
      color: #6b7280;
    }
    .type-head .meta b { color: #10b981; }
    .type-head a {
      color: #065f46;
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
    }
    .type-head a:hover { text-decoration: underline; }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    @media print {
      .sidebar, .print-btn, .logout-link, .type-head a { display: none; }
      .main { margin-left: 0; padding: 0; }
      body { background: #fff; }
      .panel, .stat { box-shadow: none; border: 1px solid #d1fae5; break-inside: avoid; }
      .type-section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <?php $sidebarActive = 'reports'; require __DIR__ . '/partials/sidebar.php'; ?>

  <div class="main">
    <div class="topbar">
      <h1><?= $view === 'sims' ? 'CUG SIM Reports' : 'Asset Reports' ?></h1>
      <div class="topbar-right">
        <button class="print-btn" type="button" onclick="window.print()">Print / Save PDF</button>
        <div class="user-chip">
          <strong><?= h($user['username']) ?></strong>
          <?= h($user['role']) ?>
        </div>
        <a class="logout-link" href="logout.php">Logout</a>
      </div>
    </div>

    <?php if ($view === 'assets'): ?>
    <div class="summary">
      <div class="stat dark">
        <h3>Total Assets</h3>
        <p><?= $grandCount ?></p>
      </div>
      <div class="stat">
        <h3>Total Value</h3>
        <p><?= number_format($grandValue, 2) ?></p>
      </div>
      <div class="stat">
        <h3>Asset Types</h3>
        <p><?= count(ASSET_TYPES) ?></p>
      </div>
      <div class="stat">
        <h3>Purchase Orders</h3>
        <p><?= (int) $pdo->query('SELECT COUNT(*) FROM orderform')->fetchColumn() ?></p>
      </div>
      <div class="stat">
        <h3>Report Date</h3>
        <p style="font-size:1.1rem;"><?= date('d M Y') ?></p>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <h2>Assets by Type</h2>
        <div class="vbars">
          <?php foreach ($report as $key => $r): ?>
            <div class="vbar">
              <span class="val"><?= $r['count'] ?></span>
              <div class="bar" style="height: <?= $r['count'] / $maxCount * 100 ?>%;"></div>
            </div>
          <?php endforeach; ?>
        </div>
        <div class="vbar-labels">
          <?php foreach (ASSET_TYPES as $t): ?><span><?= h($t['plural']) ?></span><?php endforeach; ?>
        </div>
      </div>

      <div class="panel">
        <h2>Share of Inventory</h2>
        <?php if ($grandCount === 0): ?>
          <p class="empty">No assets recorded yet.</p>
        <?php else: ?>
          <div class="donut-wrap">
            <svg class="donut" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.915" fill="#fff" stroke="#f0fdf4" stroke-width="6"></circle>
              <?php foreach ($segments as $s): if ($s['pct'] <= 0) continue; ?>
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="<?= $s['color'] ?>" stroke-width="6"
                        stroke-dasharray="<?= round($s['pct'], 3) ?> <?= round(100 - $s['pct'], 3) ?>"
                        stroke-dashoffset="<?= round(25 - $s['offset'], 3) ?>"></circle>
              <?php endforeach; ?>
              <text x="21" y="23" text-anchor="middle" class="center"><?= $grandCount ?></text>
            </svg>
            <div class="legend">
              <?php foreach ($segments as $s): ?>
                <div><i style="background: <?= $s['color'] ?>"></i><?= h(ASSET_TYPES[$s['key']]['plural']) ?><b><?= round($s['pct']) ?>%</b></div>
              <?php endforeach; ?>
            </div>
          </div>
        <?php endif; ?>
      </div>

      <div class="panel">
        <h2>Value by Type</h2>
        <div class="hbars">
          <?php foreach ($report as $key => $r): ?>
            <div class="hbar">
              <span class="lbl"><?= h(ASSET_TYPES[$key]['plural']) ?></span>
              <div class="track"><div class="fill" style="width: <?= $r['value'] / $maxValue * 100 ?>%;"></div></div>
              <span class="n"><?= number_format($r['value'], 2) ?></span>
            </div>
          <?php endforeach; ?>
        </div>
      </div>
    </div>

    <?php foreach (ASSET_TYPES as $key => $t): $r = $report[$key]; ?>
      <section class="type-section">
        <div class="type-head">
          <h2><?= h($t['plural']) ?></h2>
          <span class="meta"><b><?= $r['count'] ?></b> recorded &middot; value <b><?= number_format($r['value'], 2) ?></b> &middot; <a href="manage_assets.php?type=<?= urlencode($key) ?>">view list</a></span>
        </div>
        <?php if ($r['count'] === 0): ?>
          <div class="panel"><p class="empty">No <?= h(strtolower($t['plural'])) ?> recorded yet.</p></div>
        <?php else: ?>
          <div class="grid-3">
            <div class="panel">
              <h2>By Brand</h2>
              <div class="hbars">
                <?php $mx = max(1, (int) $r['brands'][0]['n']); foreach ($r['brands'] as $b): ?>
                  <div class="hbar">
                    <span class="lbl"><?= h($b['label']) ?></span>
                    <div class="track"><div class="fill" style="width: <?= $b['n'] / $mx * 100 ?>%;"></div></div>
                    <span class="n"><?= (int) $b['n'] ?></span>
                  </div>
                <?php endforeach; ?>
              </div>
            </div>
            <div class="panel">
              <h2>Top Models</h2>
              <div class="hbars">
                <?php $mx = max(1, (int) $r['models'][0]['n']); foreach ($r['models'] as $m): ?>
                  <div class="hbar">
                    <span class="lbl"><?= h(trim($m['label'])) ?></span>
                    <div class="track"><div class="fill" style="width: <?= $m['n'] / $mx * 100 ?>%; background:#34d399;"></div></div>
                    <span class="n"><?= (int) $m['n'] ?></span>
                  </div>
                <?php endforeach; ?>
              </div>
            </div>
            <div class="panel">
              <h2>By Purchase Order</h2>
              <div class="hbars">
                <?php $mx = max(1, (int) $r['pos'][0]['n']); foreach ($r['pos'] as $p): ?>
                  <div class="hbar">
                    <span class="lbl"><?= h($p['label']) ?><?php if ($p['InvoiceNumber']): ?><span class="sub">Inv <?= h($p['InvoiceNumber']) ?></span><?php endif; ?></span>
                    <div class="track"><div class="fill" style="width: <?= $p['n'] / $mx * 100 ?>%; background:#065f46;"></div></div>
                    <span class="n"><?= (int) $p['n'] ?></span>
                  </div>
                <?php endforeach; ?>
              </div>
            </div>
          </div>
        <?php endif; ?>
      </section>
    <?php endforeach; ?>

    <?php else: /* ================= CUG SIM reports ================= */ ?>
    <div class="summary">
      <div class="stat dark">
        <h3>Total CUG SIMs</h3>
        <p><?= $simTotals['total'] ?></p>
      </div>
      <div class="stat">
        <h3>Monthly CUG Fees</h3>
        <p><?= number_format($simTotals['fees'], 2) ?></p>
      </div>
      <div class="stat">
        <h3>Assigned to Phones</h3>
        <p><?= $simTotals['assigned'] ?></p>
      </div>
      <div class="stat">
        <h3>Unassigned</h3>
        <p><?= $simTotals['unassigned'] ?></p>
      </div>
      <div class="stat">
        <h3>Report Date</h3>
        <p style="font-size:1.1rem;"><?= date('d M Y') ?></p>
      </div>
    </div>

    <?php if ($simTotals['total'] === 0): ?>
      <div class="panel"><p class="empty">No CUG SIM cards recorded yet.</p></div>
    <?php else: ?>
    <div class="grid-2">
      <div class="panel">
        <h2>SIMs by ISP</h2>
        <div class="hbars">
          <?php $mx = max(1, ...array_column($simByIsp, 'n')); foreach ($simByIsp as $label => $d): ?>
            <div class="hbar">
              <span class="lbl"><?= h($label) ?><span class="sub"><?= number_format($d['fees'], 2) ?> / month</span></span>
              <div class="track"><div class="fill" style="width: <?= $d['n'] / $mx * 100 ?>%;"></div></div>
              <span class="n"><?= $d['n'] ?></span>
            </div>
          <?php endforeach; ?>
        </div>
      </div>

      <div class="panel">
        <h2>Assignment Status</h2>
        <div class="donut-wrap">
          <svg class="donut" viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="15.915" fill="#fff" stroke="#f0fdf4" stroke-width="6"></circle>
            <?php
              $aPct = $simTotals['total'] > 0 ? $simTotals['assigned'] / $simTotals['total'] * 100 : 0;
            ?>
            <?php if ($aPct > 0): ?>
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#10b981" stroke-width="6"
                      stroke-dasharray="<?= round($aPct, 3) ?> <?= round(100 - $aPct, 3) ?>" stroke-dashoffset="25"></circle>
            <?php endif; ?>
            <?php if ($aPct < 100): ?>
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#065f46" stroke-width="6"
                      stroke-dasharray="<?= round(100 - $aPct, 3) ?> <?= round($aPct, 3) ?>" stroke-dashoffset="<?= round(25 - $aPct, 3) ?>"></circle>
            <?php endif; ?>
            <text x="21" y="23" text-anchor="middle" class="center"><?= $simTotals['total'] ?></text>
          </svg>
          <div class="legend">
            <div><i style="background:#10b981"></i>Assigned to a phone<b><?= round($aPct) ?>%</b></div>
            <div><i style="background:#065f46"></i>Unassigned<b><?= round(100 - $aPct) ?>%</b></div>
          </div>
        </div>
      </div>

      <div class="panel">
        <h2>SIMs by Plan</h2>
        <div class="hbars">
          <?php $mx = max(1, ...array_column($simByPlan, 'n')); foreach ($simByPlan as $label => $d): ?>
            <div class="hbar">
              <span class="lbl"><?= h($label) ?></span>
              <div class="track"><div class="fill" style="width: <?= $d['n'] / $mx * 100 ?>%; background:#34d399;"></div></div>
              <span class="n"><?= $d['n'] ?></span>
            </div>
          <?php endforeach; ?>
        </div>
      </div>

      <div class="panel">
        <h2>Monthly CUG Fees by Plan</h2>
        <div class="hbars">
          <?php $mx = max(1.0, ...array_column($simByPlan, 'fees')); foreach ($simByPlan as $label => $d): ?>
            <div class="hbar">
              <span class="lbl"><?= h($label) ?></span>
              <div class="track"><div class="fill" style="width: <?= $d['fees'] / $mx * 100 ?>%; background:#065f46;"></div></div>
              <span class="n"><?= number_format($d['fees'], 2) ?></span>
            </div>
          <?php endforeach; ?>
        </div>
      </div>
    </div>
    <?php endif; ?>
    <?php endif; ?>
  </div>
</body>
</html>
