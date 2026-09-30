<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/asset_types.php';

$user = require_role(...EDITOR_ROLES);

$type = asset_type($_GET['type'] ?? null);

// No type chosen: show the asset type hub.
if ($type === null) {
    $counts = asset_type_counts(db());
    require __DIR__ . '/partials/asset_hub.php';
    exit;
}

$typeKey   = $type['key_name'];
$table     = $type['table'];
$keyCol    = $type['key'];
$hasSerial = $type['has_serial'];
$baseUrl   = 'add_asset.php?type=' . urlencode($typeKey);
$listUrl   = 'manage_assets.php?type=' . urlencode($typeKey);

$message = '';

$identifier = '';
$serial     = '';
$brand      = '';
$model      = '';
$price      = '';
$poNumber   = '';
$invoice    = '';
$editing    = false;

// Load asset for editing (invoice number comes from the linked order form)
if (isset($_GET['edit'])) {
    $stmt = db()->prepare(
        "SELECT a.*, o.InvoiceNumber
         FROM {$table} a
         LEFT JOIN orderform o ON o.PO_Number = a.PO_Number
         WHERE a.{$keyCol} = ?"
    );
    $stmt->execute([$_GET['edit']]);
    $row = $stmt->fetch();

    if ($row) {
        $identifier = $row[$keyCol];
        $serial     = $hasSerial ? ($row['SerialNumber'] ?? '') : '';
        $brand      = $row['Brand'] ?? '';
        $model      = $row['Model'] ?? '';
        $price      = $row['Price'] ?? '';
        $poNumber   = $row['PO_Number'] ?? '';
        $invoice    = $row['InvoiceNumber'] ?? '';
        $editing    = true;
    } else {
        header('Location: ' . $listUrl . '&error=1&message=' . urlencode($type['label'] . ' not found.'));
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if (!csrf_token_valid($_POST['csrf_token'] ?? null)) {
        $message = 'Your session expired. Please refresh the page and try again.';
    } elseif ($action === 'add' || $action === 'update') {
        $identifier = trim($_POST['identifier'] ?? '');
        $serial     = $hasSerial ? trim($_POST['serial'] ?? '') : '';
        $brand      = trim($_POST['brand'] ?? '');
        $model      = trim($_POST['model'] ?? '');
        $price      = ($_POST['price'] ?? '') !== '' ? (float) $_POST['price'] : null;
        $poNumber   = trim($_POST['po_number'] ?? '') ?: null;
        $invoice    = trim($_POST['invoice'] ?? '');
        $editing    = $action === 'update';

        if ($identifier === '') {
            $message = $type['key_label'] . ' is required.';
        } elseif ($invoice !== '' && $poNumber === null) {
            $message = 'A PO Number is required when entering an Invoice Number.';
        } else {
            $pdo = db();
            try {
                $pdo->beginTransaction();

                // The PO / invoice pair is stored once in orderform (PO_Number is a foreign key to it).
                // A new PO is created with the invoice entered; an existing PO keeps its invoice so
                // the shared record cannot be changed from an individual asset.
                if ($poNumber !== null) {
                    $stmt = $pdo->prepare('SELECT InvoiceNumber FROM orderform WHERE PO_Number = ? FOR UPDATE');
                    $stmt->execute([$poNumber]);
                    $existingPo = $stmt->fetch();

                    // One invoice belongs to exactly one PO.
                    if ($invoice !== '') {
                        $stmt = $pdo->prepare('SELECT PO_Number FROM orderform WHERE InvoiceNumber = ? AND PO_Number <> ?');
                        $stmt->execute([$invoice, $poNumber]);
                        if (($otherPo = $stmt->fetchColumn()) !== false) {
                            throw new RuntimeException(sprintf(
                                'Invoice %s already belongs to PO %s. Select that PO instead, or check the invoice number.',
                                $invoice,
                                $otherPo
                            ));
                        }
                    }

                    if ($existingPo === false) {
                        $stmt = $pdo->prepare('INSERT INTO orderform (PO_Number, InvoiceNumber) VALUES (?, ?)');
                        $stmt->execute([$poNumber, $invoice !== '' ? $invoice : null]);
                    } elseif (($existingPo['InvoiceNumber'] ?? '') === '' && $invoice !== '') {
                        $stmt = $pdo->prepare('UPDATE orderform SET InvoiceNumber = ? WHERE PO_Number = ?');
                        $stmt->execute([$invoice, $poNumber]);
                    } elseif ($invoice !== '' && $invoice !== $existingPo['InvoiceNumber']) {
                        throw new RuntimeException(sprintf(
                            'PO %s is already linked to invoice %s. Choose the existing PO to reuse it, or enter a different PO Number.',
                            $poNumber,
                            $existingPo['InvoiceNumber']
                        ));
                    }
                }

                $cols   = [$keyCol];
                $values = [$identifier];
                if ($hasSerial) {
                    $cols[]   = 'SerialNumber';
                    $values[] = $serial;
                }
                $cols   = array_merge($cols, ['Brand', 'Model', 'Price', 'PO_Number']);
                $values = array_merge($values, [$brand, $model, $price, $poNumber]);

                if ($action === 'add') {
                    $placeholders = implode(', ', array_fill(0, count($cols), '?'));
                    $stmt = $pdo->prepare("INSERT INTO {$table} (" . implode(', ', $cols) . ") VALUES ({$placeholders})");
                    $stmt->execute($values);
                    $done = $type['label'] . ' added successfully.';
                } else {
                    $setCols = array_slice($cols, 1);
                    $setVals = array_slice($values, 1);
                    $assignments = implode(', ', array_map(fn($c) => "{$c} = ?", $setCols));
                    $stmt = $pdo->prepare("UPDATE {$table} SET {$assignments} WHERE {$keyCol} = ?");
                    $stmt->execute([...$setVals, $identifier]);
                    $done = $type['label'] . ' updated successfully.';
                }

                $pdo->commit();
                header('Location: ' . $listUrl . '&message=' . urlencode($done));
                exit;
            } catch (RuntimeException $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                $message = $e->getMessage();
            } catch (PDOException $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                $message = ($e->getCode() === '23000' && str_contains($e->getMessage(), 'PRIMARY'))
                    ? "A {$type['label']} with that {$type['key_label']} already exists."
                    : 'Could not save asset: ' . $e->getMessage();
            }
        }
    }
}

// Existing purchase orders, used to auto-fill and lock the invoice number on the form.
$purchaseOrders = db()->query('SELECT PO_Number, InvoiceNumber FROM orderform ORDER BY PO_Number')->fetchAll();
$poInvoiceMap   = array_column($purchaseOrders, 'InvoiceNumber', 'PO_Number');

$pageTitle = ($editing ? 'Update ' : 'Add ') . $type['label'];
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

    .breadcrumb {
      font-size: 0.9rem;
      color: #6b7280;
      margin-bottom: 16px;
    }
    .breadcrumb a {
      color: #065f46;
      text-decoration: none;
      font-weight: 600;
    }
    .breadcrumb a:hover {
      text-decoration: underline;
    }

    .type-switch {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
    }
    .type-switch a {
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 7px 14px;
      border-radius: 20px;
      border: 1px solid #10b981;
      color: #065f46;
      background: #fff;
      transition: 0.3s;
    }
    .type-switch a:hover {
      background: #d1fae5;
    }
    .type-switch a.active {
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
    .field .hint.linked {
      color: #065f46;
      font-weight: 600;
    }
    .field .hint.warn {
      color: #991b1b;
      font-weight: 600;
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
    .btn-primary:hover {
      background: #065f46;
    }
    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }
    .btn-secondary:hover {
      background: #d1d5db;
    }
    .btn-outline {
      background: #fff;
      color: #065f46;
      border: 1px solid #10b981;
      margin-left: auto;
    }
    .btn-outline:hover {
      background: #d1fae5;
    }
    .note {
      margin-top: 14px;
      font-size: 0.82rem;
      color: #6b7280;
    }
  </style>
  <link rel="stylesheet" href="assets/ui.css">
</head>
<body>
  <?php $sidebarActive = 'add_asset'; require __DIR__ . '/partials/sidebar.php'; ?>

  <div class="main">
    <div class="topbar">
      <h1><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?></h1>
      <div class="topbar-right">
        <a class="logout-link" href="<?= $listUrl ?>">View <?= htmlspecialchars($type['plural'], ENT_QUOTES, 'UTF-8') ?></a>
        <div class="user-chip">
          <strong><?= htmlspecialchars($user['username'], ENT_QUOTES, 'UTF-8') ?></strong>
          <?= htmlspecialchars($user['role'], ENT_QUOTES, 'UTF-8') ?>
        </div>
        <a class="logout-link" href="logout.php">Logout</a>
      </div>
    </div>

    <p class="breadcrumb"><a href="add_asset.php">Add Asset</a> &rsaquo; <?= htmlspecialchars($type['label'], ENT_QUOTES, 'UTF-8') ?></p>

    <?php if (!$editing): ?>
      <div class="type-switch">
        <?php foreach (ASSET_TYPES as $k => $t): ?>
          <a href="add_asset.php?type=<?= urlencode($k) ?>" class="<?= $k === $typeKey ? 'active' : '' ?>"><?= htmlspecialchars($t['label'], ENT_QUOTES, 'UTF-8') ?></a>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>

    <?php if ($message !== ''): ?>
      <p class="message"><?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>

    <div class="form-card">
      <h2><?= $editing ? 'Editing ' . htmlspecialchars($type['key_label'] . ' ' . $identifier, ENT_QUOTES, 'UTF-8') : htmlspecialchars($type['label'], ENT_QUOTES, 'UTF-8') . ' Details' ?></h2>
      <form method="post" action="<?= $baseUrl . ($editing ? '&edit=' . urlencode($identifier) : '') ?>" data-validate>
        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8') ?>">
        <input type="hidden" name="action" value="<?= $editing ? 'update' : 'add' ?>">

        <div class="form-grid">
          <div class="field">
            <label for="invoice">Invoice Number</label>
            <input type="text" id="invoice" name="invoice" maxlength="50"
                   value="<?= htmlspecialchars((string) $invoice, ENT_QUOTES, 'UTF-8') ?>">
            <small class="hint" id="invoiceHint">Auto-filled when you pick an existing PO.</small>
          </div>
          <div class="field">
            <label for="po_number">PO Number</label>
            <input type="text" id="po_number" name="po_number" maxlength="50" list="poList" autocomplete="off"
                   placeholder="Select existing or type a new PO"
                   value="<?= htmlspecialchars((string) $poNumber, ENT_QUOTES, 'UTF-8') ?>"
                   <?= $editing ? '' : 'autofocus' ?>>
            <datalist id="poList">
              <?php foreach ($purchaseOrders as $po): ?>
                <option value="<?= htmlspecialchars($po['PO_Number'], ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($po['InvoiceNumber'] !== null ? 'Invoice ' . $po['InvoiceNumber'] : 'No invoice yet', ENT_QUOTES, 'UTF-8') ?></option>
              <?php endforeach; ?>
            </datalist>
            <small class="hint" id="poHint"><?= count($purchaseOrders) ?> existing PO<?= count($purchaseOrders) === 1 ? '' : 's' ?> available.</small>
          </div>
          <div class="field">
            <label for="identifier"><?= htmlspecialchars($type['key_label'], ENT_QUOTES, 'UTF-8') ?> *</label>
            <input type="text" id="identifier" name="identifier" required maxlength="50"
                   value="<?= htmlspecialchars($identifier, ENT_QUOTES, 'UTF-8') ?>"
                   <?= $editing ? 'readonly' : '' ?>>
          </div>
          <?php if ($hasSerial): ?>
          <div class="field">
            <label for="serial">Serial Number</label>
            <input type="text" id="serial" name="serial" maxlength="50"
                   value="<?= htmlspecialchars($serial, ENT_QUOTES, 'UTF-8') ?>">
          </div>
          <?php endif; ?>
          <div class="field">
            <label for="brand">Brand</label>
            <input type="text" id="brand" name="brand" maxlength="50"
                   value="<?= htmlspecialchars($brand, ENT_QUOTES, 'UTF-8') ?>">
          </div>
          <div class="field">
            <label for="model">Model</label>
            <input type="text" id="model" name="model" maxlength="100"
                   value="<?= htmlspecialchars($model, ENT_QUOTES, 'UTF-8') ?>">
          </div>
          <div class="field">
            <label for="price">Unit Price</label>
            <input type="number" id="price" name="price" step="0.01" min="0"
                   value="<?= htmlspecialchars((string) $price, ENT_QUOTES, 'UTF-8') ?>">
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary"><?= $editing ? 'Save Changes' : 'Add ' . htmlspecialchars($type['label'], ENT_QUOTES, 'UTF-8') ?></button>
          <a href="<?= $listUrl ?>" class="btn btn-secondary">Cancel</a>
          <?php if ($editing): ?>
            <a href="fat_form.php?type=<?= urlencode($typeKey) ?>&id=<?= urlencode($identifier) ?>" class="btn btn-outline" target="_blank" rel="noopener">Generate FAT Form</a>
          <?php endif; ?>
        </div>
        <?php if (!$editing): ?>
          <p class="note">Save the <?= htmlspecialchars(strtolower($type['label']), ENT_QUOTES, 'UTF-8') ?> first, then a <strong>Generate FAT Form</strong> button will appear here to print its Fixed Asset Transfer form.</p>
        <?php endif; ?>
      </form>
    </div>
  </div>

  <script src="assets/ui.js"></script>
  <script>
    // Map of existing PO numbers to their invoice numbers (null when the PO has no invoice yet).
    const poInvoices = <?= json_encode($poInvoiceMap, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;

    // Reverse map: invoice number -> PO number, to warn when an invoice is already taken.
    const invoicePos = {};
    for (const [po, inv] of Object.entries(poInvoices)) {
      if (inv) invoicePos[inv] = po;
    }

    const poInput      = document.getElementById('po_number');
    const invoiceInput = document.getElementById('invoice');
    const invoiceHint  = document.getElementById('invoiceHint');
    const poHint       = document.getElementById('poHint');
    const defaultPoHint = poHint.textContent;

    function checkInvoiceTaken() {
      if (invoiceInput.readOnly) return;
      const inv = invoiceInput.value.trim();
      const po  = poInput.value.trim();
      const owner = invoicePos[inv];

      if (inv !== '' && owner && owner !== po) {
        invoiceHint.textContent = 'Invoice ' + inv + ' already belongs to PO ' + owner + '. Select that PO instead.';
        invoiceHint.classList.add('warn');
      } else {
        invoiceHint.classList.remove('warn');
      }
    }

    function syncInvoiceWithPo() {
      const po = poInput.value.trim();

      if (po !== '' && Object.prototype.hasOwnProperty.call(poInvoices, po)) {
        const invoice = poInvoices[po];
        poHint.textContent = 'Existing PO selected.';
        poHint.classList.add('linked');

        if (invoice) {
          invoiceInput.value = invoice;
          invoiceInput.readOnly = true;
          invoiceHint.textContent = 'Linked to PO ' + po + ' - shared by every asset on this PO.';
          invoiceHint.classList.add('linked');
        } else {
          invoiceInput.readOnly = false;
          invoiceHint.textContent = 'This PO has no invoice yet - enter one to attach it.';
          invoiceHint.classList.remove('linked');
        }
      } else {
        invoiceInput.readOnly = false;
        poHint.textContent = po === '' ? defaultPoHint : 'New PO - it will be created when you save.';
        poHint.classList.remove('linked');
        invoiceHint.textContent = po === '' ? 'Auto-filled when you pick an existing PO.' : 'Enter the invoice for this new PO.';
        invoiceHint.classList.remove('linked');
      }
    }

    poInput.addEventListener('input', () => { syncInvoiceWithPo(); checkInvoiceTaken(); });
    poInput.addEventListener('change', () => { syncInvoiceWithPo(); checkInvoiceTaken(); });
    invoiceInput.addEventListener('input', checkInvoiceTaken);
    syncInvoiceWithPo();
    checkInvoiceTaken();
  </script>
</body>
</html>
