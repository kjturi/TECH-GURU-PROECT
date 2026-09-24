<?php
require_once __DIR__ . '/auth.php';

$user = require_role(...EDITOR_ROLES);

$listUrl = 'manage_sims.php';
$message = '';

$spid          = '';
$simNumber     = '';
$isp           = '';
$plan          = '';
$cugFee        = '';
$creditLimit   = '';
$ban           = '';
$dateActivated = '';
$imei          = '';
$editing       = false;

// Load SIM for editing (SPID is the primary key)
if (isset($_GET['edit'])) {
    $stmt = db()->prepare('SELECT * FROM cugsimcards WHERE SPID = ?');
    $stmt->execute([$_GET['edit']]);
    $row = $stmt->fetch();

    if ($row) {
        $spid          = $row['SPID'];
        $simNumber     = $row['SIMNumber'] ?? '';
        $isp           = $row['ISP'] ?? '';
        $plan          = $row['Plan'] ?? '';
        $cugFee        = $row['CUGFee'] ?? '';
        $creditLimit   = $row['CreditLimit'] ?? '';
        $ban           = $row['BAN'] ?? '';
        $dateActivated = $row['DateActivated'] ?? '';
        $imei          = $row['IMEINumber'] ?? '';
        $editing       = true;
    } else {
        header('Location: ' . $listUrl . '?error=1&message=' . urlencode('SIM card not found.'));
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if (!csrf_token_valid($_POST['csrf_token'] ?? null)) {
        $message = 'Your session expired. Please refresh the page and try again.';
    } elseif ($action === 'add' || $action === 'update') {
        $spid          = trim($_POST['spid'] ?? '');
        $simNumber     = trim($_POST['sim_number'] ?? '');
        $isp           = trim($_POST['isp'] ?? '');
        $plan          = trim($_POST['plan'] ?? '');
        $cugFee        = ($_POST['cug_fee'] ?? '') !== '' ? (float) $_POST['cug_fee'] : null;
        $creditLimit   = ($_POST['credit_limit'] ?? '') !== '' ? (float) $_POST['credit_limit'] : null;
        $ban           = trim($_POST['ban'] ?? '');
        $dateActivated = trim($_POST['date_activated'] ?? '') ?: null;
        $imei          = trim($_POST['imei'] ?? '') ?: null;
        $editing       = $action === 'update';

        if ($spid === '' || $simNumber === '') {
            $message = 'SIM Number and SPID are required.';
        } elseif ($dateActivated !== null && strtotime($dateActivated) === false) {
            $message = 'Activation date is not a valid date.';
        } else {
            $pdo = db();
            try {
                // A linked phone must exist in cugphones (IMEINumber is a foreign key to it).
                if ($imei !== null) {
                    $stmt = $pdo->prepare('SELECT 1 FROM cugphones WHERE IMEINumber = ?');
                    $stmt->execute([$imei]);
                    if ($stmt->fetchColumn() === false) {
                        throw new RuntimeException("No CUG mobile with IMEI {$imei} exists. Leave the field blank to keep the SIM unassigned.");
                    }
                }

                $cols   = ['SIMNumber', 'ISP', 'Plan', 'CUGFee', 'CreditLimit', 'BAN', 'DateActivated', 'IMEINumber'];
                $values = [$simNumber, $isp, $plan, $cugFee, $creditLimit, $ban, $dateActivated, $imei];

                if ($action === 'add') {
                    $stmt = $pdo->prepare(
                        'INSERT INTO cugsimcards (SPID, ' . implode(', ', $cols) . ') VALUES (?, ' . implode(', ', array_fill(0, count($cols), '?')) . ')'
                    );
                    $stmt->execute([$spid, ...$values]);
                    $done = 'SIM card added successfully.';
                } else {
                    $assignments = implode(', ', array_map(fn($c) => "{$c} = ?", $cols));
                    $stmt = $pdo->prepare("UPDATE cugsimcards SET {$assignments} WHERE SPID = ?");
                    $stmt->execute([...$values, $spid]);
                    $done = 'SIM card updated successfully.';
                }

                header('Location: ' . $listUrl . '?message=' . urlencode($done));
                exit;
            } catch (RuntimeException $e) {
                $message = $e->getMessage();
            } catch (PDOException $e) {
                $message = ($e->getCode() === '23000' && str_contains($e->getMessage(), 'PRIMARY'))
                    ? 'A SIM card with that SPID already exists.'
                    : 'Could not save SIM card: ' . $e->getMessage();
            }
        }
    }
}

// Datalist sources: registered phones for the link picker, and existing ISP / plan values.
$phones    = db()->query('SELECT IMEINumber, Brand, Model FROM cugphones ORDER BY IMEINumber')->fetchAll();
$isps      = db()->query("SELECT DISTINCT ISP FROM cugsimcards WHERE ISP IS NOT NULL AND ISP <> '' ORDER BY ISP")->fetchAll(PDO::FETCH_COLUMN);
$plans     = db()->query("SELECT DISTINCT `Plan` FROM cugsimcards WHERE `Plan` IS NOT NULL AND `Plan` <> '' ORDER BY `Plan`")->fetchAll(PDO::FETCH_COLUMN);
$knownIsps = array_values(array_unique(array_merge(['Vodafone', 'Digicel', 'Telikom'], $isps)));

$pageTitle = ($editing ? 'Update' : 'Add') . ' CUG SIM';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?> &mdash; Inventory</title>
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
      max-width: 800px;
      background: #fee2e2;
      color: #991b1b;
      border-left: 6px solid #dc2626;
    }

    .form-card {
      background: #fff;
      padding: 24px;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      max-width: 800px;
    }
    .form-card h2 {
      color: #065f46;
      margin-bottom: 18px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
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
    .field input {
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
    .field input[readonly] {
      background: #f3f4f6;
      color: #6b7280;
    }
    .field .hint {
      margin-top: 5px;
      font-size: 0.78rem;
      color: #6b7280;
      min-height: 1em;
    }
    .form-actions {
      margin-top: 20px;
      display: flex;
      gap: 10px;
    }
    button, .btn {
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
    .btn-primary:hover { background: #065f46; }
    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }
    .btn-secondary:hover { background: #d1d5db; }
    .note {
      margin-top: 14px;
      font-size: 0.82rem;
      color: #6b7280;
    }
  </style>
  <link rel="stylesheet" href="assets/ui.css">
</head>
<body>
  <?php $sidebarActive = 'add_sim'; require __DIR__ . '/partials/sidebar.php'; ?>

  <div class="main">
    <div class="topbar">
      <h1><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?></h1>
      <div class="topbar-right">
        <a class="logout-link" href="<?= $listUrl ?>">View CUG SIMs</a>
        <div class="user-chip">
          <strong><?= htmlspecialchars($user['username'], ENT_QUOTES, 'UTF-8') ?></strong>
          <?= htmlspecialchars($user['role'], ENT_QUOTES, 'UTF-8') ?>
        </div>
        <a class="logout-link" href="logout.php">Logout</a>
      </div>
    </div>

    <?php if ($message !== ''): ?>
      <p class="message"><?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>

    <div class="form-card">
      <h2><?= $editing ? 'Editing SIM ' . htmlspecialchars($spid, ENT_QUOTES, 'UTF-8') : 'SIM Card Details' ?></h2>
      <form method="post" action="add_sim.php<?= $editing ? '?edit=' . urlencode($spid) : '' ?>" data-validate>
        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8') ?>">
        <input type="hidden" name="action" value="<?= $editing ? 'update' : 'add' ?>">

        <div class="form-grid">
          <div class="field">
            <label for="sim_number">SIM Number *</label>
            <input type="text" id="sim_number" name="sim_number" required maxlength="50"
                   value="<?= htmlspecialchars($simNumber, ENT_QUOTES, 'UTF-8') ?>"
                   <?= $editing ? '' : 'autofocus' ?>>
          </div>
          <div class="field">
            <label for="spid">SPID *</label>
            <input type="text" id="spid" name="spid" required maxlength="50"
                   value="<?= htmlspecialchars($spid, ENT_QUOTES, 'UTF-8') ?>"
                   <?= $editing ? 'readonly' : '' ?>>
          </div>
          <div class="field">
            <label for="isp">ISP</label>
            <input type="text" id="isp" name="isp" maxlength="50" list="ispList" autocomplete="off"
                   value="<?= htmlspecialchars($isp, ENT_QUOTES, 'UTF-8') ?>">
            <datalist id="ispList">
              <?php foreach ($knownIsps as $i): ?>
                <option value="<?= htmlspecialchars($i, ENT_QUOTES, 'UTF-8') ?>"></option>
              <?php endforeach; ?>
            </datalist>
          </div>
          <div class="field">
            <label for="plan">Plan</label>
            <input type="text" id="plan" name="plan" maxlength="50" list="planList" autocomplete="off"
                   value="<?= htmlspecialchars($plan, ENT_QUOTES, 'UTF-8') ?>">
            <datalist id="planList">
              <?php foreach ($plans as $p): ?>
                <option value="<?= htmlspecialchars($p, ENT_QUOTES, 'UTF-8') ?>"></option>
              <?php endforeach; ?>
            </datalist>
          </div>
          <div class="field">
            <label for="cug_fee">CUG Fee (monthly)</label>
            <input type="number" id="cug_fee" name="cug_fee" step="0.01" min="0"
                   value="<?= htmlspecialchars((string) $cugFee, ENT_QUOTES, 'UTF-8') ?>">
          </div>
          <div class="field">
            <label for="credit_limit">Credit Limit</label>
            <input type="number" id="credit_limit" name="credit_limit" step="0.01" min="0"
                   value="<?= htmlspecialchars((string) $creditLimit, ENT_QUOTES, 'UTF-8') ?>">
          </div>
          <div class="field">
            <label for="ban">BAN</label>
            <input type="text" id="ban" name="ban" maxlength="50"
                   value="<?= htmlspecialchars($ban, ENT_QUOTES, 'UTF-8') ?>">
          </div>
          <div class="field">
            <label for="date_activated">Date Activated</label>
            <input type="date" id="date_activated" name="date_activated"
                   value="<?= htmlspecialchars((string) $dateActivated, ENT_QUOTES, 'UTF-8') ?>">
          </div>
          <div class="field">
            <label for="imei">Linked Phone (IMEI)</label>
            <input type="text" id="imei" name="imei" maxlength="50" list="phoneList" autocomplete="off"
                   placeholder="Leave blank if unassigned"
                   value="<?= htmlspecialchars($imei ?? '', ENT_QUOTES, 'UTF-8') ?>">
            <datalist id="phoneList">
              <?php foreach ($phones as $ph): ?>
                <option value="<?= htmlspecialchars($ph['IMEINumber'], ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars(trim($ph['Brand'] . ' ' . $ph['Model']), ENT_QUOTES, 'UTF-8') ?></option>
              <?php endforeach; ?>
            </datalist>
            <small class="hint">Pick a registered CUG mobile to attach this SIM to it.</small>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary"><?= $editing ? 'Save Changes' : 'Add SIM' ?></button>
          <a href="<?= $listUrl ?>" class="btn btn-secondary">Cancel</a>
        </div>
        <p class="note">The SPID is the SIM record's unique ID and cannot be changed once created. A SIM can only be linked to a phone that exists in the CUG Mobiles list.</p>
      </form>
    </div>
  </div>

  <script src="assets/ui.js"></script>
</body>
</html>
