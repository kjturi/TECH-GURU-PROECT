<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/asset_types.php';

$user = require_login();

// Accepts ?type=<key>&id=<identifier>; the older ?imei= link still works for CUG mobiles.
$type = asset_type($_GET['type'] ?? (isset($_GET['imei']) ? 'cug' : null)) ?? asset_type(DEFAULT_ASSET_TYPE);
$id   = trim($_GET['id'] ?? $_GET['imei'] ?? '');
$typeKey = $type['key_name'];
$listUrl = 'manage_assets.php?type=' . urlencode($typeKey);

if ($id === '') {
    header('Location: ' . $listUrl . '&error=1&message=' . urlencode('Select a ' . $type['label'] . ' to generate its FAT form.'));
    exit;
}

$serialCol = $type['has_serial'] ? 'SerialNumber' : 'NULL AS SerialNumber';
$stmt = db()->prepare("SELECT {$type['key']} AS Identifier, {$serialCol}, Brand, Model FROM {$type['table']} WHERE {$type['key']} = ?");
$stmt->execute([$id]);
$asset = $stmt->fetch();

if (!$asset) {
    header('Location: ' . $listUrl . '&error=1&message=' . urlencode($type['label'] . ' ' . $id . ' not found.'));
    exit;
}

$formNo = 'FAT-' . strtoupper($type['icon']) . '-' . date('Ymd') . '-' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $asset['Identifier']), -6));

// Serial No. box: the serial number, falling back to the identifier for types keyed by serial.
$isImeiType = $type['has_serial'];
$serialNo   = $isImeiType ? (string) ($asset['SerialNumber'] ?? '') : (string) $asset['Identifier'];

// Asset description: type + make/model, with the IMEI spelled out for IMEI-based devices.
$descParts = array_filter([$type['label'], trim(($asset['Brand'] ?? '') . ' ' . ($asset['Model'] ?? ''))]);
$description = implode(' - ', $descParts);
if ($isImeiType) {
    $description .= "\nIMEI: " . $asset['Identifier'];
}

// Default transferor details (Section A) - editable on screen before printing.
$defaults = [
    'old_location'  => 'IT VOICE - WHO Ground Floor',
    'bu_code'       => 'IT - 8224',
    'custodian'     => 'IT VOICE COMMUNICATIONS',
    'approver'      => 'ERAMASI KOSONIU',
    'approver_title'=> 'SENIOR MANAGER IT COMMUNICATIONS',
];

function h(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FAT Form &mdash; <?= h($type['label']) ?> <?= h($asset['Identifier']) ?></title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #f0fdf4;
      color: #000;
      padding: 24px;
      font-size: 11px;
    }

    .toolbar {
      max-width: 780px;
      margin: 0 auto 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .toolbar a, .toolbar button {
      font-family: inherit;
      font-size: 0.9rem;
      font-weight: 600;
      padding: 9px 16px;
      border-radius: 6px;
      border: 1px solid #10b981;
      background: #fff;
      color: #065f46;
      text-decoration: none;
      cursor: pointer;
      transition: 0.3s;
    }
    .toolbar .primary { background: #10b981; color: #fff; }
    .toolbar a:hover, .toolbar button:hover { background: #065f46; color: #fff; }
    .toolbar .tip { font-size: 0.8rem; color: #065f46; }

    /* ---------- Sheet ---------- */
    .sheet {
      max-width: 780px;
      margin: 0 auto;
      background: #fff;
      padding: 22px 26px 26px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    }

    .head { margin-bottom: 8px; }
    .head-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .head .logo {
      /* Scaled so the logo mark matches the cap height of the title text. */
      height: 1.6em;
      width: auto;
      font-size: 26px;
      flex: 0 0 auto;
    }
    .head h1 {
      font-size: 26px;
      font-weight: bold;
      line-height: 1;
    }
    .head h2 {
      font-size: 13px;
      font-weight: bold;
      text-align: center;
      margin-top: 2px;
    }

    .frame {
      border: 1px solid #000;
      background: #e9e9e9;
    }

    .section {
      padding: 8px 10px 10px;
    }
    .section + .section { border-top: 1px solid #000; }

    .sec-head {
      display: grid;
      grid-template-columns: 70px 1fr auto;
      column-gap: 8px;
      align-items: start;
      margin-bottom: 6px;
    }
    .sec-head b { font-size: 11px; }
    .sec-head i { font-size: 10.5px; }
    .sec-head .date-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }

    .box {
      background: #fff;
      border: 1px solid #000;
      min-height: 17px;
      padding: 2px 5px;
      font-size: 11.5px;
      line-height: 1.15;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .box.tall { min-height: 88px; }
    .box.sig  { min-height: 46px; }
    .box.date {
      width: 108px;
      text-align: center;
      color: #333;
      letter-spacing: 1px;
    }
    .box[contenteditable]:hover  { outline: 1px dashed #10b981; }
    .box[contenteditable]:focus  { outline: 2px solid #10b981; }

    .row {
      display: grid;
      align-items: center;
      column-gap: 6px;
      margin-top: 5px;
    }
    .row label { white-space: nowrap; }

    /* Column templates used by rows */
    .r-1   { grid-template-columns: 113px 1fr; }
    .r-2   { grid-template-columns: 113px 1fr 110px 1fr; }
    .r-2b  { grid-template-columns: 113px 1fr 150px 1fr; }
    .r-2c  { grid-template-columns: 113px 1fr 140px 110px; }
    .r-sig { grid-template-columns: 113px 140px 1fr; align-items: start; }
    .r-sig2{ grid-template-columns: 113px 1fr 100px 1fr; align-items: start; }
    .r-ent { grid-template-columns: 60px 1fr 65px 1fr 35px 110px; }

    .approval {
      padding: 4px 0 0 10px;
      font-size: 10.5px;
      line-height: 1.35;
    }
    .approval b { display: block; }

    .foot {
      max-width: 780px;
      margin: 8px auto 0;
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #555;
    }

    @media print {
      @page { size: A4; margin: 12mm; }
      body { background: #fff; padding: 0; }
      .toolbar { display: none; }
      .sheet { box-shadow: none; padding: 0; max-width: none; }
      .frame, .box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .box[contenteditable]:hover, .box[contenteditable]:focus { outline: none; }
      .foot { max-width: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <a href="<?= can_edit() ? 'add_asset.php?type=' . urlencode($typeKey) . '&edit=' . urlencode($asset['Identifier']) : $listUrl ?>">&lsaquo; Back</a>
    <span class="tip">Tip: click any white box to type into it before printing.</span>
    <button type="button" class="primary" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="sheet">
    <div class="head">
      <div class="head-title">
        <img class="logo" src="8451%20BSP%20logo%20kundu.jpg" alt="BSP logo">
        <h1>Bank South Pacific</h1>
      </div>
      <h2>FIXED ASSET TRANSFER</h2>
    </div>

    <div class="frame">
      <!-- ================= SECTION A ================= -->
      <div class="section">
        <div class="sec-head">
          <b>Section A</b>
          <i>(To be completed by the transferor and sent to the transferee with a copy to Financial Accounting)</i>
          <div class="date-cell"><label>Date of transfer:</label><div class="box date" contenteditable="true">/&nbsp;&nbsp;&nbsp;&nbsp;/ 20</div></div>
        </div>

        <label>Asset Description:</label>
        <div class="box tall" contenteditable="true" style="margin-top:3px;"><?= h($description) ?></div>

        <div class="row r-2">
          <label>Make:</label>
          <div class="box" contenteditable="true"><?= h($asset['Brand']) ?></div>
          <label>Serial No.</label>
          <div class="box" contenteditable="true"><?= h($serialNo) ?></div>
        </div>
        <div class="row r-2">
          <label>Model:</label>
          <div class="box" contenteditable="true"><?= h($asset['Model']) ?></div>
          <label>Barcode No. (Yellow)</label>
          <div class="box" contenteditable="true"></div>
        </div>
        <div class="row r-2">
          <label>Quantity:</label>
          <div class="box" contenteditable="true">1</div>
          <label>Asset No. (Sun)</label>
          <div class="box" contenteditable="true"></div>
        </div>

        <div class="row r-1"><label>Old Location:</label><div class="box" contenteditable="true"><?= h($defaults['old_location']) ?></div></div>
        <div class="row r-1"><label>Business Unit and Code:</label><div class="box" contenteditable="true"><?= h($defaults['bu_code']) ?></div></div>
        <div class="row r-1"><label>Custodian's Name:</label><div class="box" contenteditable="true"><?= h($defaults['custodian']) ?></div></div>
        <div class="row r-1"><label>Custodian's Title:</label><div class="box" contenteditable="true"></div></div>
        <div class="row r-1"><label>Approving Officer's Name:</label><div class="box" contenteditable="true"><?= h($defaults['approver']) ?></div></div>
        <div class="row r-1"><label>Approving Officer's Title:</label><div class="box" contenteditable="true"><?= h($defaults['approver_title']) ?></div></div>

        <div class="row r-sig">
          <label style="white-space:normal; line-height:1.4;">Signature of<br>Approving Officer</label>
          <div class="box sig"></div>
          <div class="approval">
            <b>Approval of transfer</b>
            (Asset is no longer required and is available for transfer)
          </div>
        </div>

        <div class="row r-1" style="grid-template-columns: 113px 140px;">
          <label>Date of Approval:</label>
          <div class="box date" contenteditable="true" style="width:140px;">/&nbsp;&nbsp;&nbsp;&nbsp;/ 20</div>
        </div>
      </div>

      <!-- ================= SECTION B ================= -->
      <div class="section">
        <div class="sec-head" style="grid-template-columns: 70px 1fr;">
          <b>Section B</b>
          <i>(To be completed by transferee with a copy to Financial Accounting)</i>
        </div>

        <div class="row r-1"><label>New Location:</label><div class="box" contenteditable="true"></div></div>
        <div class="row r-1"><label>Business Unit and Code:</label><div class="box" contenteditable="true"></div></div>
        <div class="row r-1"><label>Approving Officer's Name:</label><div class="box" contenteditable="true"></div></div>
        <div class="row r-1"><label>Approving Officer's Title:</label><div class="box" contenteditable="true"></div></div>
        <div class="row r-1"><label>Custodian's Name:</label><div class="box" contenteditable="true"></div></div>
        <div class="row r-1"><label>Custodian's Title:</label><div class="box" contenteditable="true"></div></div>

        <div class="row r-sig2">
          <label style="white-space:normal; line-height:1.4;">Signature of<br>Approving Officer:</label>
          <div class="box sig"></div>
          <label style="white-space:normal; line-height:1.4; padding-left:8px;">Signature of<br>Custodian:</label>
          <div class="box sig"></div>
        </div>

        <div class="row r-2c">
          <label>Date transfer approved:</label>
          <div class="box date" contenteditable="true" style="width:140px;">/&nbsp;&nbsp;&nbsp;&nbsp;/ 20</div>
          <label style="justify-self:end;">Date custody of asset accepted:</label>
          <div class="box date" contenteditable="true">/&nbsp;&nbsp;&nbsp;&nbsp;/ 20</div>
        </div>
      </div>

      <!-- ================= SECTION C ================= -->
      <div class="section">
        <div class="sec-head" style="grid-template-columns: 70px 1fr;">
          <b>Section C</b>
          <i>(To be completed by Financial Accounting)</i>
        </div>

        <div class="row r-2b">
          <label>Fixed Asset Register updated on:</label>
          <div class="box date" contenteditable="true" style="width:140px;">/&nbsp;&nbsp;&nbsp;&nbsp;/ 20</div>
          <label style="justify-self:end;">Asset No.</label>
          <div class="box" contenteditable="true"></div>
        </div>
        <div class="row r-2b">
          <label>Asset Account Code:</label>
          <div class="box" contenteditable="true"></div>
          <label style="justify-self:end;">Asset Class Name:</label>
          <div class="box" contenteditable="true"></div>
        </div>
        <div class="row r-2b">
          <label>Project No.:</label>
          <div class="box" contenteditable="true"></div>
          <label style="justify-self:end;">Location Code:</label>
          <div class="box" contenteditable="true"></div>
        </div>
        <div class="row r-1"><label>Business Unit and Code:</label><div class="box" contenteditable="true"></div></div>

        <div class="row r-ent">
          <label>Entries by:</label>
          <div class="box" contenteditable="true"></div>
          <label>Journal No.</label>
          <div class="box" contenteditable="true"></div>
          <label>Date:</label>
          <div class="box date" contenteditable="true">/&nbsp;&nbsp;&nbsp;&nbsp;/ 20</div>
        </div>
        <div class="row r-1" style="grid-template-columns: 113px 140px;">
          <label>Confirmation sent on:</label>
          <div class="box date" contenteditable="true" style="width:140px;">/&nbsp;&nbsp;&nbsp;&nbsp;/ 20</div>
        </div>
      </div>
    </div>

    <div class="foot">
      <span><?= h($formNo) ?> &middot; <?= h($type['label']) ?> <?= h($asset['Identifier']) ?></span>
      <span>Generated <?= date('d M Y') ?> by <?= h($user['username']) ?></span>
    </div>
  </div>
</body>
</html>
